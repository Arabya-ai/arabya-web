import { NextResponse } from "next/server";
import { parseMptTermsBody } from "@/lib/mpt-payload";
import { MPT_GENERATE_LIMIT, proxyMptJson, requireMptSession } from "@/lib/mpt-proxy";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const gate = await requireMptSession(MPT_GENERATE_LIMIT);
  if ("error" in gate) return gate.error;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const parsed = parseMptTermsBody(raw);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  return proxyMptJson({
    method: "POST",
    pathname: "/api/v1/terms",
    body: parsed.body,
    timeoutMs: 90_000,
  });
}
