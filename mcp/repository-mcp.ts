import { z } from "zod";
import { McpClientManager, formatMcpToolResult } from "@/mcp/client-manager";
import type { SessionUser } from "@/server/auth/session";
import {
  getConnectedRepository,
  getUserGitHubAccessToken
} from "@/server/repositories/repositories";

export const mcpToolCallRequestSchema = z.object({
  name: z.string().min(1),
  arguments: z.record(z.string(), z.unknown()).default({})
});

export async function createRepositoryMcpManager(user: SessionUser, repositoryId: string) {
  const [accessToken, repository] = await Promise.all([
    getUserGitHubAccessToken(user.id),
    getConnectedRepository(user, repositoryId)
  ]);

  if (!repository) {
    throw new Error("Repository not found.");
  }

  return new McpClientManager({
    githubToken: accessToken,
    repository: {
      owner: repository.repoOwner,
      name: repository.repoName
    }
  });
}

export async function listRepositoryMcpTools(user: SessionUser, repositoryId: string) {
  const manager = await createRepositoryMcpManager(user, repositoryId);

  try {
    return await manager.listTools();
  } finally {
    await manager.close();
  }
}

export async function callRepositoryMcpTool(
  user: SessionUser,
  repositoryId: string,
  name: string,
  input: Record<string, unknown>
) {
  const manager = await createRepositoryMcpManager(user, repositoryId);

  try {
    const result = await manager.callTool(name, input);
    return {
      result,
      text: formatMcpToolResult(result)
    };
  } finally {
    await manager.close();
  }
}
