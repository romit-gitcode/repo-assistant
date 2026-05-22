import { z } from "zod";

const githubRepositorySchema = z.object({
  id: z.number(),
  name: z.string(),
  full_name: z.string(),
  private: z.boolean(),
  html_url: z.string().url(),
  default_branch: z.string(),
  owner: z.object({
    login: z.string()
  }),
  updated_at: z.string()
});

const githubRepositoriesSchema = z.array(githubRepositorySchema);

export type GitHubRepositorySummary = {
  githubRepoId: number;
  name: string;
  owner: string;
  fullName: string;
  isPrivate: boolean;
  url: string;
  defaultBranch: string;
  updatedAt: string;
};

export async function listGitHubRepositories(accessToken: string) {
  const repos: GitHubRepositorySummary[] = [];
  let page = 1;

  while (page <= 5) {
    const url = new URL("https://api.github.com/user/repos");
    url.searchParams.set("affiliation", "owner,collaborator,organization_member");
    url.searchParams.set("sort", "updated");
    url.searchParams.set("direction", "desc");
    url.searchParams.set("per_page", "100");
    url.searchParams.set("page", String(page));

    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${accessToken}`,
        "X-GitHub-Api-Version": "2022-11-28"
      },
      next: { revalidate: 0 }
    });

    if (!response.ok) {
      throw new Error("Failed to fetch GitHub repositories.");
    }

    const payload = githubRepositoriesSchema.parse(await response.json());
    repos.push(
      ...payload.map((repo) => ({
        githubRepoId: repo.id,
        name: repo.name,
        owner: repo.owner.login,
        fullName: repo.full_name,
        isPrivate: repo.private,
        url: repo.html_url,
        defaultBranch: repo.default_branch,
        updatedAt: repo.updated_at
      }))
    );

    if (payload.length < 100) {
      break;
    }

    page += 1;
  }

  return repos;
}
