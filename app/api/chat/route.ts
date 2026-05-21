import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";

export async function POST() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json(
    { error: "Chat streaming is implemented in Step 5." },
    { status: 501 }
  );
}
