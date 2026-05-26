"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import { Loader2, SendHorizontal, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";

type ChatRepository = {
  id: string;
  repoName: string;
  repoOwner: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type ChatPanelProps = {
  repositories: ChatRepository[];
};

const starterPrompts = [
  "Explain the architecture",
  "Summarize open pull requests",
  "Find risky dependencies",
  "Search for auth logic"
];

function parseSseBuffer(buffer: string) {
  const events = buffer.split("\n\n");
  const rest = events.pop() ?? "";

  return {
    rest,
    events: events
      .map((eventText) => {
        const event = eventText
          .split("\n")
          .find((line) => line.startsWith("event: "))
          ?.slice("event: ".length);
        const data = eventText
          .split("\n")
          .find((line) => line.startsWith("data: "))
          ?.slice("data: ".length);

        if (!event || !data) {
          return null;
        }

        return { event, data: JSON.parse(data) as Record<string, unknown> };
      })
      .filter(Boolean) as Array<{ event: string; data: Record<string, unknown> }>
  };
}

export function ChatPanel({ repositories }: ChatPanelProps) {
  const [selectedRepositoryId, setSelectedRepositoryId] = useState(repositories[0]?.id ?? "");
  const [chatId, setChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [toolActivity, setToolActivity] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const assistantMessageId = useRef<string | null>(null);

  const selectedRepository = useMemo(
    () => repositories.find((repo) => repo.id === selectedRepositoryId) ?? repositories[0],
    [repositories, selectedRepositoryId]
  );

  async function sendMessage(message: string) {
    if (!selectedRepository || !message.trim() || isStreaming) {
      return;
    }

    setError(null);
    setToolActivity(null);
    setIsStreaming(true);
    setInput("");

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message.trim()
    };
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: ""
    };
    assistantMessageId.current = assistantMessage.id;
    setMessages((current) => [...current, userMessage, assistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          repositoryId: selectedRepository.id,
          ...(chatId ? { chatId } : {}),
          content: message.trim()
        })
      });

      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Failed to start chat stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parsed = parseSseBuffer(buffer);
        buffer = parsed.rest;

        for (const event of parsed.events) {
          if (event.event === "meta" && typeof event.data.chatId === "string") {
            setChatId(event.data.chatId);
          }

          if (event.event === "tool" && typeof event.data.name === "string") {
            setToolActivity(event.data.name);
          }

          if (event.event === "token" && typeof event.data.text === "string") {
            const id = assistantMessageId.current;
            setMessages((current) =>
              current.map((currentMessage) =>
                currentMessage.id === id
                  ? { ...currentMessage, content: currentMessage.content + event.data.text }
                  : currentMessage
              )
            );
          }

          if (event.event === "error" && typeof event.data.message === "string") {
            throw new Error(event.data.message);
          }
        }
      }
    } catch (caughtError) {
      const errorMessage = caughtError instanceof Error ? caughtError.message : "Chat failed.";
      setError(errorMessage);
      setMessages((current) =>
        current.map((messageItem) =>
          messageItem.id === assistantMessageId.current
            ? { ...messageItem, content: errorMessage }
            : messageItem
        )
      );
    } finally {
      assistantMessageId.current = null;
      setToolActivity(null);
      setIsStreaming(false);
    }
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  function startNewChat() {
    setChatId(null);
    setMessages([]);
    setError(null);
    setToolActivity(null);
  }

  return (
    <section className="flex min-h-screen flex-col">
      <header className="flex h-14 items-center justify-between border-b border-border px-5">
        <div>
          <h1 className="text-sm font-semibold">Repository Chat</h1>
          <p className="text-xs text-muted-foreground">Grounded by MCP tools, powered by Gemini.</p>
        </div>
        <div className="flex items-center gap-2">
          {repositories.length > 0 ? (
            <select
              value={selectedRepository?.id ?? ""}
              onChange={(event) => {
                setSelectedRepositoryId(event.target.value);
                startNewChat();
              }}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm outline-none"
            >
              {repositories.map((repo) => (
                <option key={repo.id} value={repo.id}>
                  {repo.repoOwner}/{repo.repoName}
                </option>
              ))}
            </select>
          ) : null}
          <Button variant="secondary" type="button" onClick={startNewChat}>
            New chat
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col px-4 py-6">
        {messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-3xl space-y-8">
              <div className="space-y-3 text-center">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-accent text-accent-foreground">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    Ask your repository anything
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    The assistant will inspect code, issues, pull requests, and files through MCP
                    before answering.
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {starterPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendMessage(prompt)}
                    disabled={!selectedRepository || isStreaming}
                    className="rounded-md border border-border bg-card p-3 text-left text-sm transition hover:border-accent hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-4">
            {messages.map((message) => (
              <article
                key={message.id}
                className={
                  message.role === "user"
                    ? "ml-auto max-w-[85%] rounded-md bg-primary px-4 py-3 text-sm text-primary-foreground"
                    : "mr-auto max-w-[90%] rounded-md border border-border bg-card px-4 py-3 text-sm"
                }
              >
                <div className="whitespace-pre-wrap leading-6">
                  {message.content || (message.role === "assistant" ? "Thinking..." : "")}
                </div>
              </article>
            ))}
            {toolActivity ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wrench className="h-3.5 w-3.5" />
                Using {toolActivity}
              </div>
            ) : null}
          </div>
        )}

        <div className="mx-auto mt-6 w-full max-w-3xl">
          {error ? (
            <div className="mb-3 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          {!selectedRepository ? (
            <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
              Connect a repository before starting a chat.
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="flex items-end gap-2 rounded-md border border-border bg-card p-2 shadow-sm"
            >
              <textarea
                className="min-h-12 flex-1 resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Ask about architecture, files, issues, pull requests, or improvements..."
                rows={2}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={isStreaming}
              />
              <Button size="icon" aria-label="Send message" disabled={isStreaming || !input.trim()}>
                {isStreaming ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizontal className="h-4 w-4" />
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
