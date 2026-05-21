import { users } from "@/db/schema";
import { getDb } from "@/db/client";
import type { GitHubProfile } from "@/server/auth/github";

export async function upsertGitHubUser(profile: GitHubProfile, accessToken: string) {
  const [user] = await getDb()
    .insert(users)
    .values({
      githubId: profile.id,
      username: profile.login,
      avatarUrl: profile.avatar_url,
      githubAccessToken: accessToken
    })
    .onConflictDoUpdate({
      target: users.githubId,
      set: {
        username: profile.login,
        avatarUrl: profile.avatar_url,
        githubAccessToken: accessToken
      }
    })
    .returning({
      id: users.id,
      githubId: users.githubId,
      username: users.username,
      avatarUrl: users.avatarUrl
    });

  return user;
}
