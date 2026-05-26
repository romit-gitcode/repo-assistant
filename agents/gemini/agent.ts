import {
  FunctionCallingConfigMode,
  GoogleGenAI,
  type Content,
  type FunctionCall,
  type FunctionDeclaration
} from "@google/genai";
import { getGeminiEnv } from "@/lib/env";
import { formatMcpToolResult } from "@/mcp/client-manager";
import { createRepositoryMcpManager } from "@/mcp/repository-mcp";
import type { SessionUser } from "@/server/auth/session";
import type { RepositoryRef } from "@/types";

export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

export type RunAgentInput = {
  user: SessionUser;
  repositoryId: string;
  repository: RepositoryRef;
  messages: AgentMessage[];
};

type AgentStreamEvent =
  | { type: "tool"; name: string }
  | { type: "token"; text: string }
  | { type: "done"; text: string };

const maxAgentToolIterations = 4;
const maxToolOutputChars = 12_000;
const maxFunctionDeclarations = 40;

function getSystemInstruction(repository: RepositoryRef) {
  return [
    "You are an AI-powered GitHub Repository Assistant.",
    `You are scoped to repository ${repository.owner}/${repository.name}.`,
    "Use available MCP tools before answering repository-specific questions about files, issues, pull requests, commits, dependencies, or architecture.",
    "For connected GitHub repositories, prefer GitHub MCP tools. Do not use local filesystem evidence unless filesystem MCP is explicitly configured for this repository.",
    "Never invent repository facts. If tools are unavailable or insufficient, say what you could not verify.",
    "Summarize long tool outputs and cite the tool-derived evidence in plain language.",
    "Do not request or perform destructive actions. The available tool registry is intended to be read-only.",
    "Keep answers concise, technical, and useful for a developer."
  ].join("\n");
}

function toGeminiContents(messages: AgentMessage[]): Content[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }]
  }));
}

function normalizeJsonSchema(schema: Record<string, unknown>) {
  if (schema.type === "object") {
    return schema;
  }

  return {
    type: "object",
    properties: {},
    ...schema
  };
}

type McpToolList = Awaited<ReturnType<Awaited<ReturnType<typeof createRepositoryMcpManager>>["listTools"]>>;

function toFunctionDeclarations(tools: McpToolList) {
  return tools
    .slice(0, maxFunctionDeclarations)
    .map<FunctionDeclaration>((tool) => ({
      name: tool.name,
      description: tool.description,
      parametersJsonSchema: normalizeJsonSchema(tool.inputSchema)
    }));
}

function getCandidateContent(response: { candidates?: Array<{ content?: Content }> }) {
  return response.candidates?.[0]?.content;
}

function truncateToolOutput(text: string) {
  if (text.length <= maxToolOutputChars) {
    return text;
  }

  return `${text.slice(0, maxToolOutputChars)}\n\n[Tool output truncated to ${maxToolOutputChars} characters.]`;
}

function functionResponseContent(functionCalls: FunctionCall[], results: Array<{ name: string; text: string }>): Content {
  return {
    role: "user",
    parts: functionCalls.map((functionCall, index) => ({
      functionResponse: {
        id: functionCall.id,
        name: functionCall.name,
        response: {
          output: truncateToolOutput(results[index]?.text ?? "")
        }
      }
    }))
  };
}

export async function* runRepositoryAgent(input: RunAgentInput): AsyncGenerator<AgentStreamEvent> {
  const manager = await createRepositoryMcpManager(input.user, input.repositoryId);
  const ai = new GoogleGenAI({ apiKey: getGeminiEnv().GEMINI_API_KEY });

  try {
    const tools = await manager.listTools();
    const functionDeclarations = toFunctionDeclarations(tools);
    const contents = toGeminiContents(input.messages);
    const config = {
      systemInstruction: getSystemInstruction(input.repository),
      temperature: 0.2,
      maxOutputTokens: 2048,
      tools: functionDeclarations.length > 0 ? [{ functionDeclarations }] : undefined,
      toolConfig:
        functionDeclarations.length > 0
          ? {
              functionCallingConfig: {
                mode: FunctionCallingConfigMode.AUTO
              }
            }
          : undefined
    };

    for (let iteration = 0; iteration < maxAgentToolIterations; iteration += 1) {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents,
        config
      });
      const functionCalls = response.functionCalls ?? [];

      if (functionCalls.length === 0) {
        const finalText = response.text ?? "";
        if (finalText) {
          yield { type: "token", text: finalText };
        }
        yield { type: "done", text: finalText };
        return;
      }

      const validFunctionCalls = functionCalls.filter(
        (functionCall): functionCall is FunctionCall & { name: string } =>
          typeof functionCall.name === "string"
      );
      const modelContent = getCandidateContent(response);
      if (modelContent) {
        contents.push(modelContent);
      }

      const toolResults: Array<{ name: string; text: string }> = [];
      for (const functionCall of validFunctionCalls) {
        yield { type: "tool", name: functionCall.name };
        const toolResult = await manager.callTool(functionCall.name, functionCall.args ?? {});
        const text = formatMcpToolResult(toolResult);
        toolResults.push({ name: functionCall.name, text });
      }

      contents.push(functionResponseContent(validFunctionCalls, toolResults));
    }

    contents.push({
      role: "user",
      parts: [
        {
          text: "Stop calling tools now. Produce the best grounded answer from the tool results already provided."
        }
      ]
    });

    const responseStream = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: getSystemInstruction(input.repository),
        temperature: 0.2,
        maxOutputTokens: 2048,
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.NONE
          }
        }
      }
    });
    let finalText = "";

    for await (const chunk of responseStream) {
      const text = chunk.text ?? "";
      if (!text) {
        continue;
      }

      finalText += text;
      yield { type: "token", text };
    }

    yield { type: "done", text: finalText };
  } finally {
    await manager.close();
  }
}
