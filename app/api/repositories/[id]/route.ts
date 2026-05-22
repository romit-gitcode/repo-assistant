import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import { disconnectRepository } from "@/server/repositories/repositories";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await disconnectRepository(user, id);

  if (!deleted) {
    return NextResponse.json({ error: "Repository not found." }, { status: 404 });
  }

  return NextResponse.json({ repository: deleted });
}
