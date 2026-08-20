import { auth } from "@/auth";
import {
  deleteUserKey,
  saveUserKey,
} from "@/lib/lughawi/credentials-store";
import type { AiProviderId } from "@/lib/lughawi/types";
import { NextResponse } from "next/server";

const IDS: AiProviderId[] = [
  "google",
  "openrouter",
  "openai",
  "anthropic",
  "groq",
  "ollama",
];

type Ctx = { params: Promise<{ id: string }> };

export async function PUT(req: Request, ctx: Ctx) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email || session?.error === "Banned") {
    return NextResponse.json({ error: "auth" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!IDS.includes(id as AiProviderId)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  }
  let body: { apiKey?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!body.apiKey?.trim()) {
    return NextResponse.json({ error: "apiKey required" }, { status: 400 });
  }
  try {
    const { last4 } = saveUserKey(email, id as AiProviderId, body.apiKey);
    return NextResponse.json({ ok: true, last4 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "save failed" },
      { status: 400 },
    );
  }
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  if (!email || session?.error === "Banned") {
    return NextResponse.json({ error: "auth" }, { status: 401 });
  }
  const { id } = await ctx.params;
  if (!IDS.includes(id as AiProviderId)) {
    return NextResponse.json({ error: "unknown provider" }, { status: 400 });
  }
  const ok = deleteUserKey(email, id as AiProviderId);
  return NextResponse.json({ ok });
}
