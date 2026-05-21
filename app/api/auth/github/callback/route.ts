import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForGitHubToken, fetchGitHubProfile } from "@/server/auth/github";
import { consumeOAuthStateCookie, setSessionCookie } from "@/server/auth/session";
import { upsertGitHubUser } from "@/server/auth/users";
import { getAppUrl } from "@/lib/env";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const appUrl = getAppUrl();

  if (!code) {
    return NextResponse.redirect(`${appUrl}/?auth=missing_code`);
  }

  const hasValidState = await consumeOAuthStateCookie(state);
  if (!hasValidState) {
    return NextResponse.redirect(`${appUrl}/?auth=invalid_state`);
  }

  try {
    const accessToken = await exchangeCodeForGitHubToken(code);
    const profile = await fetchGitHubProfile(accessToken);
    const user = await upsertGitHubUser(profile, accessToken);
    const response = NextResponse.redirect(appUrl);

    await setSessionCookie(response, user);

    return response;
  } catch {
    return NextResponse.redirect(`${appUrl}/?auth=github_failed`);
  }
}
