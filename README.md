# AI GitHub Repository Assistant

A production-structured MVP for chatting with GitHub repositories through a Gemini-powered agent that uses MCP tools for repository intelligence.

## Phase 1 Architecture

```text
┌────────────────────────────────────────────────────────────────────┐
│                         Next.js 15 App Router                       │
│                                                                    │
│  ┌───────────────┐      ┌────────────────┐      ┌───────────────┐  │
│  │  Auth Routes  │      │ Repository API │      │   Chat API    │  │
│  │ GitHub OAuth  │      │ Connect/List   │      │ Streaming SSE │  │
│  └───────┬───────┘      └───────┬────────┘      └───────┬───────┘  │
│          │                      │                       │          │
│  ┌───────▼──────────────────────▼───────────────────────▼───────┐  │
│  │                         Server Layer                          │  │
│  │ sessions, GitHub OAuth, repository service, chat service       │  │
│  └───────┬──────────────────────┬───────────────────────┬───────┘  │
│          │                      │                       │          │
│  ┌───────▼───────┐      ┌───────▼────────┐      ┌───────▼───────┐  │
│  │ Drizzle ORM   │      │ Gemini Agent   │      │ MCP Manager   │  │
│  │ PostgreSQL    │      │ Tool Loop      │      │ Tool Registry │  │
│  └───────┬───────┘      └───────┬────────┘      └───────┬───────┘  │
│          │                      │                       │          │
└──────────┼──────────────────────┼───────────────────────┼──────────┘
           │                      │                       │
     ┌─────▼─────┐          ┌─────▼─────┐          ┌──────▼──────┐
     │PostgreSQL │          │  Gemini   │          │ GitHub MCP  │
     │   Neon    │          │ 2.5 Flash │          │ Filesystem  │
     └───────────┘          └───────────┘          └─────────────┘
```

## Folder Structure

```text
app/
  api/
    auth/github/
    chat/
    repositories/
  globals.css
  layout.tsx
  page.tsx
agents/
  gemini/
components/
  app-shell.tsx
  chat/
  repositories/
  ui/
db/
  client/
  schema/
lib/
  env.ts
  utils.ts
mcp/
  client-manager.ts
  tool-registry.ts
server/
  auth/
  repositories/
  rate-limit.ts
types/
  index.ts
```

## Database Schema

Phase 1 uses Drizzle ORM with PostgreSQL. The schema is defined in [`db/schema/index.ts`](./db/schema/index.ts).

Tables:

- `users`: GitHub identity profile.
- `repositories`: repositories connected by a user.
- `chats`: repository-scoped conversations.
- `messages`: persisted user and assistant messages.
- `mcp_cache`: optional repository-scoped MCP result cache.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

3. Fill in:

   ```bash
   GEMINI_API_KEY=
   GITHUB_CLIENT_ID=
   GITHUB_CLIENT_SECRET=
   DATABASE_URL=
   SESSION_SECRET=
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. Push the Drizzle schema directly to your database:

   ```bash
   npm run db:push
   ```

5. Start development:

   ```bash
   npm run dev
   ```

## Implementation Roadmap

### Step 1: Foundation

- Next.js 15 App Router setup.
- TailwindCSS and shadcn-compatible UI primitives.
- Strict TypeScript configuration.
- Drizzle schema, database client, and push-based database sync config.
- Production-oriented folder boundaries.

### Step 2: Authentication

- GitHub OAuth authorization and callback routes.
- Secure signed session cookie.
- Server-side GitHub token storage.
- Current-user helper for API routes.

### Step 3: Repository Management

- Fetch GitHub repositories using the authenticated user token.
- Connect and disconnect repositories.
- Persist connected repositories with Drizzle.
- Sidebar repository selector.

### Step 4: MCP Integration

- MCP client manager for GitHub and filesystem MCP servers.
- Tool registry that exposes sanitized tool definitions to the agent.
- Guardrails for repository-scoped tool calls.

### Step 5: Gemini Agent

- Gemini 2.5 Flash streaming adapter.
- Dynamic MCP tool-calling loop.
- Repository-grounded system prompt.
- Retry, summarization, and context trimming.

### Step 6: Chat Experience

- Streaming chat route.
- Chat/message persistence.
- Markdown and code rendering.
- Responsive Cursor/Linear/Vercel-inspired app shell.

## Phase 1 Tradeoffs

- No vector database: MCP tools provide live repository context for the MVP.
- No multi-agent orchestration: a single well-scoped agent loop is easier to reason about and safer to ship.
- Minimal cache: `mcp_cache` exists for expensive MCP responses, but repository truth stays source-of-record in GitHub and files.
- Vercel-compatible route handlers: long-running MCP sessions may later move to workers if usage grows.
