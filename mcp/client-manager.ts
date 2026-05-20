export type McpServerName = "github" | "filesystem";

export type McpClientConfig = {
  githubToken: string;
  repositoryRoot?: string;
};

export class McpClientManager {
  constructor(private readonly config: McpClientConfig) {}

  async listTools() {
    void this.config;
    return [];
  }

  async callTool(name: string, input: Record<string, unknown>) {
    void name;
    void input;
    throw new Error("MCP tool execution is implemented in Step 4.");
  }
}
