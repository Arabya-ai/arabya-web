import { NextResponse } from "next/server";
import { isSafeTaskId } from "@/lib/mpt-payload";
import { MPT_JSON_LIMIT, proxyMptJson, requireMptSession } from "@/lib/mpt-proxy";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ taskId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const gate = await requireMptSession(MPT_JSON_LIMIT);
  if ("error" in gate) return gate.error;

  const { taskId } = await ctx.params;
  if (!isSafeTaskId(taskId)) {
    return NextResponse.json({ ok: false, error: "invalid_task" }, { status: 400 });
  }

  return proxyMptJson({
    method: "GET",
    pathname: `/api/v1/tasks/${taskId}`,
    timeoutMs: 15_000,
  });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const gate = await requireMptSession(MPT_JSON_LIMIT);
  if ("error" in gate) return gate.error;

  const { taskId } = await ctx.params;
  if (!isSafeTaskId(taskId)) {
    return NextResponse.json({ ok: false, error: "invalid_task" }, { status: 400 });
  }

  return proxyMptJson({
    method: "DELETE",
    pathname: `/api/v1/tasks/${taskId}`,
    timeoutMs: 20_000,
  });
}
