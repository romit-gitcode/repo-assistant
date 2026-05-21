import { GitBranch, LogIn, LogOut, MessageSquare, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatPanel } from "@/components/chat/chat-panel";
import { RepositoryList } from "@/components/repositories/repository-list";
import { getCurrentUser } from "@/server/auth/session";

export async function AppShell() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-screen bg-background">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[280px_1fr]">
        <aside className="border-b border-border bg-card/70 md:border-b-0 md:border-r">
          <div className="flex h-14 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <GitBranch className="h-4 w-4 text-accent" />
              Repo Assistant
            </div>
            {user ? (
              <form action="/api/auth/logout" method="post">
                <Button size="icon" variant="ghost" aria-label="Log out">
                  <LogOut className="h-4 w-4" />
                </Button>
              </form>
            ) : (
              <Button size="icon" variant="ghost" aria-label="Connect GitHub" asChild>
                <a href="/api/auth/github">
                  <LogIn className="h-4 w-4" />
                </a>
              </Button>
            )}
          </div>
          <div className="space-y-6 p-4">
            {user ? (
              <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-md border border-border"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-xs font-medium">
                    {user.username.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{user.username}</p>
                  <p className="text-xs text-muted-foreground">GitHub connected</p>
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                Connect GitHub to manage repositories and start repository-aware chats.
              </div>
            )}
            <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
              <Search className="h-4 w-4" />
              Search connected repos
            </div>
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Repositories
                </h2>
                <Button size="icon" variant="ghost" aria-label="Add repository">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <RepositoryList />
            </section>
            <section className="space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Chats
              </h2>
              <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                <MessageSquare className="mb-2 h-4 w-4" />
                Connect a repository to start a chat.
              </div>
            </section>
          </div>
        </aside>
        <ChatPanel />
      </div>
    </main>
  );
}
