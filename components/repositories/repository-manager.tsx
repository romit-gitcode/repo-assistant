"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitFork, Loader2, Lock, Plus, Radio, Trash2, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConnectedRepository = {
  id: string;
  repoName: string;
  repoOwner: string;
  githubRepoId: number;
};

type GitHubRepository = {
  githubRepoId: number;
  name: string;
  owner: string;
  fullName: string;
  isPrivate: boolean;
  defaultBranch: string;
  updatedAt: string;
  connected: boolean;
};

type RepositoryManagerProps = {
  isAuthenticated: boolean;
  initialRepositories: ConnectedRepository[];
};

export function RepositoryManager({
  isAuthenticated,
  initialRepositories
}: RepositoryManagerProps) {
  const router = useRouter();
  const [connectedRepositories, setConnectedRepositories] = useState(initialRepositories);
  const [availableRepositories, setAvailableRepositories] = useState<GitHubRepository[]>([]);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isLoadingGitHubRepos, setIsLoadingGitHubRepos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingRepoId, setPendingRepoId] = useState<number | string | null>(null);
  const [isPending, startTransition] = useTransition();

  const connectedIds = useMemo(
    () => new Set(connectedRepositories.map((repo) => repo.githubRepoId)),
    [connectedRepositories]
  );

  async function loadGitHubRepositories() {
    setError(null);
    setIsPickerOpen(true);

    if (availableRepositories.length > 0) {
      return;
    }

    setIsLoadingGitHubRepos(true);

    try {
      const response = await fetch("/api/github/repositories");
      const payload = (await response.json()) as {
        repositories?: GitHubRepository[];
        error?: string;
      };

      if (!response.ok || !payload.repositories) {
        throw new Error(payload.error ?? "Failed to load GitHub repositories.");
      }

      setAvailableRepositories(payload.repositories);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to load repositories.");
    } finally {
      setIsLoadingGitHubRepos(false);
    }
  }

  async function connect(repo: GitHubRepository) {
    setError(null);
    setPendingRepoId(repo.githubRepoId);

    try {
      const response = await fetch("/api/repositories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          githubRepoId: repo.githubRepoId,
          repoName: repo.name,
          repoOwner: repo.owner
        })
      });
      const payload = (await response.json()) as {
        repository?: ConnectedRepository;
        error?: string;
      };

      if (!response.ok || !payload.repository) {
        throw new Error(payload.error ?? "Failed to connect repository.");
      }

      setConnectedRepositories((current) => {
        const withoutDuplicate = current.filter(
          (connectedRepo) => connectedRepo.githubRepoId !== payload.repository?.githubRepoId
        );
        return [payload.repository, ...withoutDuplicate].filter(Boolean) as ConnectedRepository[];
      });
      setAvailableRepositories((current) =>
        current.map((availableRepo) =>
          availableRepo.githubRepoId === repo.githubRepoId
            ? { ...availableRepo, connected: true }
            : availableRepo
        )
      );

      startTransition(() => router.refresh());
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Failed to connect repository.");
    } finally {
      setPendingRepoId(null);
    }
  }

  async function disconnect(repo: ConnectedRepository) {
    setError(null);
    setPendingRepoId(repo.id);

    try {
      const response = await fetch(`/api/repositories/${repo.id}`, {
        method: "DELETE"
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to disconnect repository.");
      }

      setConnectedRepositories((current) =>
        current.filter((connectedRepo) => connectedRepo.id !== repo.id)
      );
      setAvailableRepositories((current) =>
        current.map((availableRepo) =>
          availableRepo.githubRepoId === repo.githubRepoId
            ? { ...availableRepo, connected: false }
            : availableRepo
        )
      );

      startTransition(() => router.refresh());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error ? caughtError.message : "Failed to disconnect repository."
      );
    } finally {
      setPendingRepoId(null);
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
        Sign in with GitHub before connecting repositories.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Repositories
        </h2>
        <Button
          size="icon"
          variant="ghost"
          aria-label="Add repository"
          type="button"
          onClick={loadGitHubRepositories}
          disabled={isLoadingGitHubRepos || isPending}
        >
          {isLoadingGitHubRepos ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>

      {connectedRepositories.length > 0 ? (
        <div className="space-y-2">
          {connectedRepositories.map((repo, index) => (
            <div
              key={repo.id}
              className="group flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm transition hover:border-accent hover:bg-secondary"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">
                  {repo.repoOwner}/{repo.repoName}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {index === 0 ? <Radio className="h-4 w-4 text-accent" /> : null}
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={`Disconnect ${repo.repoOwner}/${repo.repoName}`}
                  type="button"
                  onClick={() => disconnect(repo)}
                  disabled={pendingRepoId === repo.id}
                  className="h-7 w-7 opacity-70 group-hover:opacity-100"
                >
                  {pendingRepoId === repo.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          No repositories connected yet.
        </div>
      )}

      {isPickerOpen ? (
        <div className="space-y-2 rounded-md border border-border bg-background p-2">
          <div className="flex items-center gap-2 px-1 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <GitFork className="h-3.5 w-3.5" />
            GitHub repositories
          </div>
          {error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {isLoadingGitHubRepos ? (
            <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading repositories
            </div>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
              {availableRepositories.map((repo) => {
                const isConnected = repo.connected || connectedIds.has(repo.githubRepoId);
                const statusText =
                  pendingRepoId === repo.githubRepoId
                    ? "Connecting"
                    : isConnected
                      ? "Connected"
                      : "Connect";

                return (
                  <button
                    key={repo.githubRepoId}
                    type="button"
                    onClick={() => (isConnected ? undefined : connect(repo))}
                    disabled={isConnected || pendingRepoId === repo.githubRepoId}
                    className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm transition hover:bg-secondary disabled:cursor-default disabled:opacity-70"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {repo.isPrivate ? (
                        <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <Unlock className="h-4 w-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0">
                        <span className="block truncate">{repo.fullName}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {repo.defaultBranch}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {statusText}
                    </span>
                  </button>
                );
              })}
              {availableRepositories.length === 0 && !error ? (
                <div className="p-3 text-sm text-muted-foreground">
                  No GitHub repositories were returned for this account.
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
