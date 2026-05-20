import { SendHorizontal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const starterPrompts = [
  "Explain the architecture",
  "Summarize open pull requests",
  "Find risky dependencies",
  "Search for auth logic"
];

export function ChatPanel() {
  return (
    <section className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-5">
        <div>
          <h1 className="text-sm font-semibold">Repository Chat</h1>
          <p className="text-xs text-muted-foreground">Grounded by MCP tools, powered by Gemini.</p>
        </div>
        <Button variant="secondary">New chat</Button>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-3xl space-y-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Ask your repository anything</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                The assistant will inspect code, issues, pull requests, and files through MCP before answering.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {starterPrompts.map((prompt) => (
              <button
                key={prompt}
                className="rounded-md border border-border bg-card p-3 text-left text-sm transition hover:border-accent hover:bg-secondary"
              >
                {prompt}
              </button>
            ))}
          </div>

          <form className="flex items-end gap-2 rounded-md border border-border bg-card p-2 shadow-sm">
            <textarea
              className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
              placeholder="Ask about architecture, files, issues, pull requests, or improvements..."
              rows={2}
            />
            <Button size="icon" aria-label="Send message">
              <SendHorizontal className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
