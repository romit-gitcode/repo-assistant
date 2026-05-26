import { z } from "zod";

export const toolCallSchema = z.object({
  name: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()).default({})
});

export type RegisteredTool = {
  name: string;
  serverName: "github" | "filesystem";
  originalName: string;
  description: string;
  inputSchema: Record<string, unknown>;
};

export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();

  register(tool: RegisteredTool) {
    this.tools.set(tool.name, tool);
  }

  list() {
    return Array.from(this.tools.values());
  }

  get(name: string) {
    return this.tools.get(name);
  }

  sanitizeCall(input: unknown) {
    const parsed = toolCallSchema.parse(input);
    if (!this.tools.has(parsed.name)) {
      throw new Error(`Tool is not registered: ${parsed.name}`);
    }
    return parsed;
  }
}
