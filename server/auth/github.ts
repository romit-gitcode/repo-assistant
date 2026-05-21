import { z } from "zod";
import { getGitHubOAuthEnv } from "@/lib/env";

const githubTokenSchema = z.object({
  access_token: z.string().min(1),
  token_type: z.string(),
  scope: z.string().optional()
});

const githubUserSchema = z.object({
  id: z.number(),
  login: z.string(),
  avatar_url: z.string().url().nullable()
});

export type GitHubProfile = z.infer<typeof githubUserSchema>;

export function buildGitHubAuthorizeUrl(state: string) {
  const env = getGitHubOAuthEnv();
  const url = new URL("https://github.com/login/oauth/authorize");

  url.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", `${env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`);
  url.searchParams.set("scope", "read:user repo");
  url.searchParams.set("state", state);
  url.searchParams.set("allow_signup", "true");

  return url;
}

export async function exchangeCodeForGitHubToken(code: string) {
  const env = getGitHubOAuthEnv();
  const response = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/github/callback`
    })
  });

  if (!response.ok) {
    throw new Error("Failed to exchange GitHub OAuth code.");
  }

  const payload: unknown = await response.json();
  const parsed = githubTokenSchema.safeParse(payload);

  if (!parsed.success) {
    throw new Error("GitHub OAuth token response was invalid.");
  }

  return parsed.data.access_token;
}

export async function fetchGitHubProfile(accessToken: string) {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28"
    }
  });

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub profile.");
  }

  return githubUserSchema.parse(await response.json());
}
