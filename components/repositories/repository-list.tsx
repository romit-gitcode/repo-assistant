import { Lock, Radio } from "lucide-react";

const placeholderRepos = [
  { owner: "acme", name: "platform", active: true },
  { owner: "acme", name: "web", active: false }
];

export function RepositoryList() {
  return (
    <div className="space-y-2">
      {placeholderRepos.map((repo) => (
        <button
          key={`${repo.owner}/${repo.name}`}
          className="flex w-full items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-left text-sm transition hover:border-accent hover:bg-secondary"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {repo.owner}/{repo.name}
            </span>
          </span>
          {repo.active ? <Radio className="h-4 w-4 text-accent" /> : null}
        </button>
      ))}
    </div>
  );
}
