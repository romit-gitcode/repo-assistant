import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionEnv } from "@/lib/env";

const sessionCookieName = "repo_assistant_session";
const oauthStateCookieName = "repo_assistant_oauth_state";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;
const oauthStateMaxAgeSeconds = 60 * 10;

export type SessionUser = {
  id: string;
  githubId: number;
  username: string;
  avatarUrl: string | null;
};

type SessionPayload = SessionUser & {
  exp: number;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return createHmac("sha256", getSessionEnv().SESSION_SECRET).update(value).digest("base64url");
}

function verifySignature(value: string, signature: string) {
  const expected = sign(value);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  if (expectedBuffer.length !== signatureBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, signatureBuffer);
}

function createSessionToken(user: SessionUser) {
  const payload: SessionPayload = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + sessionMaxAgeSeconds
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  return `${encodedPayload}.${sign(encodedPayload)}`;
}

function parseSessionToken(token: string): SessionUser | null {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature || !verifySignature(encodedPayload, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as SessionPayload;

    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return {
      id: payload.id,
      githubId: payload.githubId,
      username: payload.username,
      avatarUrl: payload.avatarUrl
    };
  } catch {
    return null;
  }
}

export function createOAuthState() {
  return randomBytes(32).toString("base64url");
}

export async function setOAuthStateCookie(state: string) {
  const cookieStore = await cookies();
  cookieStore.set(oauthStateCookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: oauthStateMaxAgeSeconds
  });
}

export async function consumeOAuthStateCookie(state: string | null) {
  if (!state) {
    return false;
  }

  const cookieStore = await cookies();
  const storedState = cookieStore.get(oauthStateCookieName)?.value;
  cookieStore.delete(oauthStateCookieName);

  return Boolean(storedState && storedState === state);
}

export async function setSessionCookie(response: NextResponse, user: SessionUser) {
  response.cookies.set(sessionCookieName, createSessionToken(user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAgeSeconds
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(sessionCookieName, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;

  if (!token) {
    return null;
  }

  return parseSessionToken(token);
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();

  if (!user) {
    throw new Error("Unauthorized.");
  }

  return user;
}
