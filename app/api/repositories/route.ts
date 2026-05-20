import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { error: "Repository management is implemented in Step 3." },
    { status: 501 }
  );
}
