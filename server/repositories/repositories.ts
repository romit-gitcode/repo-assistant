import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { repositories, users } from "@/db/schema";
import type { SessionUser } from "@/server/auth/session";

export const connectRepositorySchema = z.object({
  githubRepoId: z.number().int().positive(),
  repoName: z.string().min(1).max(200),
  repoOwner: z.string().min(1).max(200)
});

export type ConnectRepositoryInput = z.infer<typeof connectRepositorySchema>;

export async function getUserGitHubAccessToken(userId: string) {
  const [user] = await getDb()
    .select({ githubAccessToken: users.githubAccessToken })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user?.githubAccessToken) {
    throw new Error("GitHub access token was not found for the current user.");
  }

  return user.githubAccessToken;
}

export async function listConnectedRepositories(user: SessionUser) {
  return getDb()
    .select({
      id: repositories.id,
      repoName: repositories.repoName,
      repoOwner: repositories.repoOwner,
      githubRepoId: repositories.githubRepoId,
      createdAt: repositories.createdAt
    })
    .from(repositories)
    .where(eq(repositories.userId, user.id))
    .orderBy(desc(repositories.createdAt));
}

export async function getConnectedRepository(user: SessionUser, repositoryId: string) {
  const [repo] = await getDb()
    .select({
      id: repositories.id,
      repoName: repositories.repoName,
      repoOwner: repositories.repoOwner,
      githubRepoId: repositories.githubRepoId,
      createdAt: repositories.createdAt
    })
    .from(repositories)
    .where(and(eq(repositories.id, repositoryId), eq(repositories.userId, user.id)))
    .limit(1);

  return repo ?? null;
}

export async function connectRepository(user: SessionUser, input: ConnectRepositoryInput) {
  const [repo] = await getDb()
    .insert(repositories)
    .values({
      userId: user.id,
      repoName: input.repoName,
      repoOwner: input.repoOwner,
      githubRepoId: input.githubRepoId
    })
    .onConflictDoUpdate({
      target: [repositories.userId, repositories.githubRepoId],
      set: {
        repoName: input.repoName,
        repoOwner: input.repoOwner
      }
    })
    .returning({
      id: repositories.id,
      repoName: repositories.repoName,
      repoOwner: repositories.repoOwner,
      githubRepoId: repositories.githubRepoId,
      createdAt: repositories.createdAt
    });

  return repo;
}

export async function disconnectRepository(user: SessionUser, repositoryId: string) {
  const [repo] = await getDb()
    .delete(repositories)
    .where(and(eq(repositories.id, repositoryId), eq(repositories.userId, user.id)))
    .returning({ id: repositories.id });

  return repo ?? null;
}
