import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { error: "Chat streaming is implemented in Step 5." },
    { status: 501 }
  );
}
