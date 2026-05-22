import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { listGitHubRepositories } from "@/server/repositories/github";
import { getUserGitHubAccessToken, listConnectedRepositories } from "@/server/repositories/repositories";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const [accessToken, connectedRepos] = await Promise.all([
      getUserGitHubAccessToken(user.id),
      listConnectedRepositories(user)
    ]);
    const connectedIds = new Set(connectedRepos.map((repo) => repo.githubRepoId));
    const repositories = await listGitHubRepositories(accessToken);

    return NextResponse.json({
      repositories: repositories.map((repo) => ({
        ...repo,
        connected: connectedIds.has(repo.githubRepoId)
      }))
    });
  } catch {
    return NextResponse.json({ error: "Failed to load GitHub repositories." }, { status: 502 });
  }
}
