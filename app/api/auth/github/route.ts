import { NextResponse } from "next/server";
import { buildGitHubAuthorizeUrl } from "@/server/auth/github";
import { createOAuthState, setOAuthStateCookie } from "@/server/auth/session";

export async function GET() {
  const state = createOAuthState();
  await setOAuthStateCookie(state);

  return NextResponse.redirect(buildGitHubAuthorizeUrl(state));
}
