import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json(
    { error: "Repository management is implemented in Step 3." },
    { status: 501 }
  );
}
