import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/server/auth/session";
import { getAppUrl } from "@/lib/env";

export async function POST() {
  const response = NextResponse.redirect(getAppUrl(), { status: 303 });
  clearSessionCookie(response);

  return response;
}
