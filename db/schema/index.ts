import { relations } from "drizzle-orm";
import {
  bigint,
  index,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

export const messageRole = pgEnum("message_role", ["user", "assistant"]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    githubId: bigint("github_id", { mode: "number" }).notNull(),
    username: text("username").notNull(),
    avatarUrl: text("avatar_url"),
    githubAccessToken: text("github_access_token").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    githubIdIdx: uniqueIndex("users_github_id_idx").on(table.githubId),
    usernameIdx: index("users_username_idx").on(table.username)
  })
);

export const repositories = pgTable(
  "repositories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    repoName: text("repo_name").notNull(),
    repoOwner: text("repo_owner").notNull(),
    githubRepoId: bigint("github_repo_id", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdx: index("repositories_user_id_idx").on(table.userId),
    githubRepoIdx: uniqueIndex("repositories_user_github_repo_id_idx").on(
      table.userId,
      table.githubRepoId
    )
  })
);

export const chats = pgTable(
  "chats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("New chat"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    userIdx: index("chats_user_id_idx").on(table.userId),
    repositoryIdx: index("chats_repository_id_idx").on(table.repositoryId)
  })
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    chatId: uuid("chat_id")
      .notNull()
      .references(() => chats.id, { onDelete: "cascade" }),
    role: messageRole("role").notNull(),
    content: text("content").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    chatIdx: index("messages_chat_id_idx").on(table.chatId)
  })
);

export const mcpCache = pgTable(
  "mcp_cache",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    repositoryId: uuid("repository_id")
      .notNull()
      .references(() => repositories.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: jsonb("value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
  },
  (table) => ({
    repositoryKeyIdx: uniqueIndex("mcp_cache_repository_key_idx").on(table.repositoryId, table.key)
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  repositories: many(repositories),
  chats: many(chats)
}));

export const repositoriesRelations = relations(repositories, ({ one, many }) => ({
  user: one(users, {
    fields: [repositories.userId],
    references: [users.id]
  }),
  chats: many(chats),
  cacheEntries: many(mcpCache)
}));

export const chatsRelations = relations(chats, ({ one, many }) => ({
  user: one(users, {
    fields: [chats.userId],
    references: [users.id]
  }),
  repository: one(repositories, {
    fields: [chats.repositoryId],
    references: [repositories.id]
  }),
  messages: many(messages)
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  chat: one(chats, {
    fields: [messages.chatId],
    references: [chats.id]
  })
}));

export const mcpCacheRelations = relations(mcpCache, ({ one }) => ({
  repository: one(repositories, {
    fields: [mcpCache.repositoryId],
    references: [repositories.id]
  })
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Repository = typeof repositories.$inferSelect;
export type NewRepository = typeof repositories.$inferInsert;
export type Chat = typeof chats.$inferSelect;
export type NewChat = typeof chats.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type McpCacheEntry = typeof mcpCache.$inferSelect;
export type NewMcpCacheEntry = typeof mcpCache.$inferInsert;
