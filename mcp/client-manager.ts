import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  StdioClientTransport,
  getDefaultEnvironment
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { getMcpEnv } from "@/lib/env";
import { ToolRegistry, type RegisteredTool } from "@/mcp/tool-registry";

export type McpServerName = "github" | "filesystem";

export type McpClientConfig = {
  githubToken: string;
  repository: {
    owner: string;
    name: string;
  };
  filesystemRoot?: string;
};

type ServerConnection = {
  client: Client;
  transport: StdioClientTransport;
};

type McpToolResult = Awaited<ReturnType<Client["callTool"]>>;

function splitArgs(value: string) {
  return value.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((part) => part.replace(/^"|"$/g, "")) ?? [];
}

function parseOptionalArgs(value: string | undefined) {
  if (!value?.trim()) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === "string")) {
      return parsed;
    }
  } catch {
    return splitArgs(value);
  }

  return splitArgs(value);
}

function getFilesystemServerPath() {
  const binaryPath = join(process.cwd(), "node_modules", ".bin", "mcp-server-filesystem");

  if (!existsSync(binaryPath)) {
    throw new Error("Filesystem MCP server binary was not found.");
  }

  return binaryPath;
}

function getFilesystemRoot(configuredRoot: string | undefined) {
  const root = resolve(configuredRoot || getMcpEnv().MCP_FILESYSTEM_ROOT || process.cwd());

  if (!existsSync(root)) {
    throw new Error(`Filesystem MCP root does not exist: ${root}`);
  }

  return root;
}

function buildGitHubServerArgs() {
  const env = getMcpEnv();
  const overrideArgs = parseOptionalArgs(env.MCP_GITHUB_ARGS);

  if (overrideArgs) {
    return overrideArgs;
  }

  const toolsets = env.MCP_GITHUB_TOOLSETS || "default";

  return [
    "run",
    "-i",
    "--rm",
    "-e",
    "GITHUB_PERSONAL_ACCESS_TOKEN",
    "-e",
    `GITHUB_TOOLSETS=${toolsets}`,
    "ghcr.io/github/github-mcp-server"
  ];
}

function isAllowedTool(serverName: McpServerName, toolName: string) {
  const normalized = toolName.toLowerCase();

  if (serverName === "filesystem") {
    return [
      "read_file",
      "read_text_file",
      "read_media_file",
      "read_multiple_files",
      "list_directory",
      "list_directory_with_sizes",
      "directory_tree",
      "search_files",
      "get_file_info",
      "list_allowed_directories"
    ].includes(normalized);
  }

  return (
    normalized.startsWith("get_") ||
    normalized.startsWith("list_") ||
    normalized.startsWith("search_")
  );
}

export class McpClientManager {
  private readonly registry = new ToolRegistry();
  private readonly connections = new Map<McpServerName, ServerConnection>();

  constructor(private readonly config: McpClientConfig) {}

  async listTools() {
    const errors: Error[] = [];

    for (const serverName of ["github", "filesystem"] satisfies McpServerName[]) {
      try {
        await this.registerServerTools(serverName);
      } catch (error) {
        errors.push(error instanceof Error ? error : new Error(`Failed to connect ${serverName}`));
      }
    }

    if (this.registry.list().length === 0 && errors.length > 0) {
      throw new Error(errors.map((error) => error.message).join(" "));
    }

    return this.registry.list();
  }

  async callTool(name: string, input: Record<string, unknown>) {
    if (this.registry.list().length === 0) {
      await this.listTools();
    }

    const sanitized = this.registry.sanitizeCall({ name, arguments: input });
    const tool = this.registry.get(sanitized.name);

    if (!tool) {
      throw new Error(`Tool is not registered: ${sanitized.name}`);
    }

    const connection = await this.connect(tool.serverName);
    const guardedInput = this.guardToolInput(tool, sanitized.arguments);

    return connection.client.callTool({
      name: tool.originalName,
      arguments: guardedInput
    });
  }

  async close() {
    await Promise.all(
      Array.from(this.connections.values()).map(async (connection) => {
        await connection.client.close();
      })
    );
    this.connections.clear();
  }

  private async registerServerTools(serverName: McpServerName) {
    const connection = await this.connect(serverName);
    const { tools } = await connection.client.listTools();

    for (const tool of tools) {
      if (!isAllowedTool(serverName, tool.name)) {
        continue;
      }

      this.registry.register({
        name: `${serverName}__${tool.name}`,
        serverName,
        originalName: tool.name,
        description: tool.description ?? `${serverName} MCP tool: ${tool.name}`,
        inputSchema: tool.inputSchema
      });
    }
  }

  private async connect(serverName: McpServerName) {
    const existing = this.connections.get(serverName);

    if (existing) {
      return existing;
    }

    const client = new Client({
      name: "repo-assistant",
      version: "0.1.0"
    });
    const transport = new StdioClientTransport(this.getServerParameters(serverName));

    await client.connect(transport);

    const connection = { client, transport };
    this.connections.set(serverName, connection);

    return connection;
  }

  private getServerParameters(serverName: McpServerName) {
    const env = getMcpEnv();

    if (serverName === "github") {
      return {
        command: env.MCP_GITHUB_COMMAND || "docker",
        args: buildGitHubServerArgs(),
        env: {
          ...getDefaultEnvironment(),
          GITHUB_PERSONAL_ACCESS_TOKEN: this.config.githubToken,
          GITHUB_TOOLSETS: env.MCP_GITHUB_TOOLSETS || "default"
        },
        stderr: "pipe" as const
      };
    }

    return {
      command: getFilesystemServerPath(),
      args: [getFilesystemRoot(this.config.filesystemRoot)],
      env: getDefaultEnvironment(),
      stderr: "pipe" as const
    };
  }

  private guardToolInput(tool: RegisteredTool, input: Record<string, unknown>) {
    if (tool.serverName !== "github") {
      return input;
    }

    const owner = this.config.repository.owner;
    const repo = this.config.repository.name;

    return {
      ...input,
      owner,
      repo,
      repository: `${owner}/${repo}`
    };
  }
}

export function formatMcpToolResult(result: McpToolResult) {
  const content = "content" in result && Array.isArray(result.content) ? result.content : null;

  if (content) {
    return content
      .map((content) => {
        if (content && typeof content === "object" && "type" in content && content.type === "text") {
          return content.text;
        }

        if (
          content &&
          typeof content === "object" &&
          "type" in content &&
          content.type === "resource" &&
          "resource" in content &&
          content.resource &&
          typeof content.resource === "object"
        ) {
          return "text" in content.resource ? content.resource.text : content.resource.blob;
        }

        return "[non-text content]";
      })
      .join("\n\n");
  }

  return JSON.stringify(result.toolResult, null, 2);
}
