import { getGeminiEnv } from "@/lib/env";
import type { RepositoryRef } from "@/types";

export type AgentMessage = {
  role: "user" | "assistant";
  content: string;
};

export type RunAgentInput = {
  repository: RepositoryRef;
  messages: AgentMessage[];
};

export async function runRepositoryAgent(input: RunAgentInput) {
  void getGeminiEnv().GEMINI_API_KEY;
  void input;
  throw new Error("Gemini MCP tool loop is implemented in Step 5.");
}
