import { z } from "zod";

const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1),
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000")
});

export type Env = z.infer<typeof envSchema>;

const appUrlSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000")
});

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url()
});

const geminiEnvSchema = z.object({
  GEMINI_API_KEY: z.string().min(1)
});

const githubOAuthEnvSchema = z.object({
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000")
});

const sessionEnvSchema = z.object({
  SESSION_SECRET: z.string().min(32)
});

let cachedEnv: Env | null = null;

export function getEnv() {
  cachedEnv ??= envSchema.parse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    SESSION_SECRET: process.env.SESSION_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  });

  return cachedEnv;
}

export function getAppUrl() {
  return appUrlSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  }).NEXT_PUBLIC_APP_URL;
}

export function getDatabaseEnv() {
  return databaseEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL
  });
}

export function getGeminiEnv() {
  return geminiEnvSchema.parse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY
  });
}

export function getGitHubOAuthEnv() {
  return githubOAuthEnvSchema.parse({
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  });
}

export function getSessionEnv() {
  return sessionEnvSchema.parse({
    SESSION_SECRET: process.env.SESSION_SECRET
  });
}
