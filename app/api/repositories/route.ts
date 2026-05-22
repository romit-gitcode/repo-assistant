import { NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import {
  connectRepository,
  connectRepositorySchema,
  listConnectedRepositories
} from "@/server/repositories/repositories";

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const repositories = await listConnectedRepositories(user);

  return NextResponse.json({ repositories });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = connectRepositorySchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid repository payload." }, { status: 400 });
  }

  const repository = await connectRepository(user, parsed.data);

  return NextResponse.json({ repository }, { status: 201 });
}
