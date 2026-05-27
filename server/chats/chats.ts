import { and, asc, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/db/client";
import { chats, messages } from "@/db/schema";
import type { SessionUser } from "@/server/auth/session";

export const chatRequestSchema = z.object({
  repositoryId: z.string().uuid(),
  chatId: z.string().uuid().nullish().transform((value) => value ?? undefined),
  content: z.string().min(1).max(8000)
});

export type ChatRequest = z.infer<typeof chatRequestSchema>;

export async function getOrCreateChat(user: SessionUser, input: ChatRequest) {
  if (input.chatId) {
    const [existingChat] = await getDb()
      .select({
        id: chats.id,
        title: chats.title,
        repositoryId: chats.repositoryId
      })
      .from(chats)
      .where(
        and(
          eq(chats.id, input.chatId),
          eq(chats.userId, user.id),
          eq(chats.repositoryId, input.repositoryId)
        )
      )
      .limit(1);

    if (existingChat) {
      return existingChat;
    }
  }

  const title = input.content.trim().slice(0, 80) || "New chat";
  const [chat] = await getDb()
    .insert(chats)
    .values({
      userId: user.id,
      repositoryId: input.repositoryId,
      title
    })
    .returning({
      id: chats.id,
      title: chats.title,
      repositoryId: chats.repositoryId
    });

  return chat;
}

export async function listChatMessages(chatId: string) {
  return getDb()
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt
    })
    .from(messages)
    .where(eq(messages.chatId, chatId))
    .orderBy(asc(messages.createdAt));
}

export async function listUserChats(userId: string) {
  return getDb()
    .select({
      id: chats.id,
      title: chats.title,
      repositoryId: chats.repositoryId,
      createdAt: chats.createdAt
    })
    .from(chats)
    .where(eq(chats.userId, userId))
    .orderBy(desc(chats.createdAt));
}

export async function saveMessage(chatId: string, role: "user" | "assistant", content: string) {
  const [message] = await getDb()
    .insert(messages)
    .values({
      chatId,
      role,
      content
    })
    .returning({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      createdAt: messages.createdAt
    });

  return message;
}
