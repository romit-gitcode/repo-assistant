# 🤖 AI GitHub Repository Assistant

An open-source, MVP web application for chatting with GitHub repositories. It uses a **Gemini-powered agent** and the **Model Context Protocol (MCP)** to provide deep intelligence and live context about your code.

## ✨ Features

- **GitHub OAuth Authentication**: Securely log in using your GitHub account. 
- **Live Repository Intelligence**: Uses GitHub MCP to directly read repository files, issues, and pull requests in real-time.
- **Gemini 2.5 Flash Agent**: Fast, streaming AI responses using an intelligent, repository-grounded tool-calling loop.
- **Chat Persistence**: Chat sessions and messages are saved securely.
- **Modern Tech Stack**: Built with Next.js 15 (App Router), Tailwind CSS, Drizzle ORM, and Neon PostgreSQL.

## 🏗️ Architecture

```text
┌────────────────────────────────────────────────────────────────────┐
│                         Next.js 15 App Router                      │
│                                                                    │
│  ┌───────────────┐      ┌────────────────┐      ┌───────────────┐  │
│  │  Auth Routes  │      │ Repository API │      │   Chat API    │  │
│  │ GitHub OAuth  │      │ Connect/List   │      │ Streaming SSE │  │
│  └───────┬───────┘      └───────┬────────┘      └───────┬───────┘  │
│          │                      │                       │          │
│  ┌───────▼──────────────────────▼───────────────────────▼───────┐  │
│  │                         Server Layer                         │  │
│  │ sessions, GitHub OAuth, repository service, chat service     │  │
│  └───────┬───────┬───────┬───────┬───────┬───────┬───────┬──────┘  │
│          │       │       │       │       │       │       │         │
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

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL Database (e.g., [Neon](https://neon.tech), Supabase, or local Postgres)
- Docker (required to run the official GitHub MCP server)
- A Google Gemini API Key
- A GitHub account (to create an OAuth App)

### 1. Installation

```bash
git clone https://github.com/yourusername/repo-assistant.git
cd repo-assistant
npm install
```

### 2. Environment Variables

Copy the `.env.example` file to create your local environment configuration:

```bash
cp .env.example .env.local
```

Fill in the required variables in `.env.local`:

- `GEMINI_API_KEY`: Get one from [Google AI Studio](https://aistudio.google.com/).
- `DATABASE_URL`: Your PostgreSQL connection string.
- `SESSION_SECRET`: Generate a random 32+ character secure string (e.g., `openssl rand -base64 32`).
- `NEXT_PUBLIC_APP_URL`: Set to `http://localhost:3000` for local development.

### 3. GitHub OAuth App Setup

To allow users to log in (including yourself), you need to create a GitHub OAuth App:
1. Go to your GitHub Developer Settings -> [OAuth Apps](https://github.com/settings/developers).
2. Click **New OAuth App**.
3. Set **Homepage URL** to `http://localhost:3000`.
4. Set **Authorization callback URL** to `http://localhost:3000/api/auth/github/callback`.
5. Generate the client secret.
6. Add the Client ID and Client Secret to your `.env.local` as `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET`.

*(Note: Once configured, **any** GitHub user can log into your app and chat with their own repositories!)*

### 4. Database Setup

Push the Drizzle schema directly to your PostgreSQL database:

```bash
npm run db:push
```

### 5. Run the Application

You can run the application using either Node.js locally or with Docker.

#### Option A: Run Locally

Make sure Docker is running on your machine (it is used to spawn the GitHub MCP container), then start the development server:

```bash
npm run dev
```

#### Option B: Run with Docker Compose

If you have Docker installed, you can easily build and run the entire application containerized:

```bash
docker-compose up -d --build
```

Visit `http://localhost:3000` to log in and start chatting!

## ⚙️ MCP Integrations

This project uses the Model Context Protocol (MCP) to give the AI agent read-only access to repositories. By default, connected remote repositories use the official GitHub MCP server via Docker:

```bash
docker run -i --rm \
  -e GITHUB_PERSONAL_ACCESS_TOKEN \
  -e GITHUB_TOOLSETS=default \
  ghcr.io/github/github-mcp-server
```

*(Note: File mutation and GitHub mutation tools are intentionally filtered out for safety in this MVP).*

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/repo-assistant/issues).

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
