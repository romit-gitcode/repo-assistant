import { NextResponse } from "next/server";
import { runRepositoryAgent, type AgentMessage } from "@/agents/gemini/agent";
import { getCurrentUser } from "@/server/auth/session";
import { assertRateLimit } from "@/server/rate-limit";
import { chatRequestSchema, getOrCreateChat, listChatMessages, saveMessage } from "@/server/chats/chats";
import { getConnectedRepository } from "@/server/repositories/repositories";

function encodeEvent(event: string, data: unknown) {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    assertRateLimit(user.id, 20, 60_000);
  } catch {
    return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
  }

  const parsed = chatRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid chat payload." }, { status: 400 });
  }

  const repository = await getConnectedRepository(user, parsed.data.repositoryId);

  if (!repository) {
    return NextResponse.json({ error: "Repository not found." }, { status: 404 });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const encoder = new TextEncoder();
      let assistantText = "";

      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(encodeEvent(event, data)));
      }

      try {
        const chat = await getOrCreateChat(user, parsed.data);
        const history = await listChatMessages(chat.id);
        await saveMessage(chat.id, "user", parsed.data.content);

        send("meta", {
          chatId: chat.id,
          title: chat.title,
          repository: {
            id: repository.id,
            owner: repository.repoOwner,
            name: repository.repoName
          }
        });

        const agentMessages: AgentMessage[] = [
          ...history.map((message) => ({
            role: message.role,
            content: message.content
          })),
          {
            role: "user" as const,
            content: parsed.data.content
          }
        ];

        for await (const event of runRepositoryAgent({
          user,
          repositoryId: repository.id,
          repository: {
            owner: repository.repoOwner,
            name: repository.repoName,
            githubRepoId: repository.githubRepoId
          },
          messages: agentMessages
        })) {
          if (event.type === "tool") {
            send("tool", { name: event.name });
          }

          if (event.type === "token") {
            assistantText += event.text;
            send("token", { text: event.text });
          }

          if (event.type === "done") {
            assistantText = event.text || assistantText;
          }
        }

        await saveMessage(chat.id, "assistant", assistantText || "I could not produce an answer.");
        send("done", { chatId: chat.id });
        controller.close();
      } catch (error) {
        send("error", {
          message: error instanceof Error ? error.message : "Failed to stream chat response."
        });
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    }
  });
}
