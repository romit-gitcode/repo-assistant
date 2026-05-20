export type RepositoryRef = {
  owner: string;
  name: string;
  githubRepoId: number;
};

export type ChatRole = "user" | "assistant";

export type AgentToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};
