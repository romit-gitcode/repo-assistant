import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth/session";
import {
  callRepositoryMcpTool,
  listRepositoryMcpTools,
  mcpToolCallRequestSchema
} from "@/mcp/repository-mcp";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { id } = await params;

  try {
    const tools = await listRepositoryMcpTools(user, id);
    return NextResponse.json({ tools });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to list MCP tools."
      },
      { status: 502 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const parsed = mcpToolCallRequestSchema.safeParse(await request.json());

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid MCP tool call payload." }, { status: 400 });
  }

  const { id } = await params;

  try {
    const toolResult = await callRepositoryMcpTool(
      user,
      id,
      parsed.data.name,
      parsed.data.arguments
    );

    return NextResponse.json(toolResult);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to call MCP tool."
      },
      { status: 502 }
    );
  }
}
