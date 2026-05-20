import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json(
    { error: "GitHub OAuth is implemented in Step 2." },
    { status: 501 }
  );
}
