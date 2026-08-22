import { auth } from "@/auth";
import { recordFeedback } from "@/lib/lughawi/learning-store";
import { sessionSkipsLughawiRateLimit } from "@/lib/lughawi/rate-limit-policy";
import { enforceRateLimit, LUGHAWI_TOOL_LIMIT } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/** Crowd learn: accept/reject/custom — signed-in only (prevents anonymous poisoning). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email || session.error === "Banned") {
    return NextResponse.json(
      { error: "يلزم تسجيل الدخول لقبول أو رفض اقتراح" },
      { status: 401 },
    );
  }

  if (!sessionSkipsLughawiRateLimit(session)) {
    const limited = enforceRateLimit(req, {
      prefix: "lughawi-feedback",
      limit: LUGHAWI_TOOL_LIMIT,
    });
    if (limited) return limited;
  }

  let body: {
    from?: string;
    to?: string;
    decision?: string;
    ruleId?: string;
    customTo?: string;
    tier?: string;
    source?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const decision =
    body.decision === "accepted" ||
    body.decision === "rejected" ||
    body.decision === "custom"
      ? body.decision
      : null;
  if (!decision || !body.from?.trim() || !body.to?.trim()) {
    return NextResponse.json(
      { error: "from, to, decision required" },
      { status: 400 },
    );
  }
  if (decision === "custom" && !body.customTo?.trim()) {
    return NextResponse.json(
      { error: "customTo required for custom decision" },
      { status: 400 },
    );
  }

  try {
    const row = recordFeedback({
      from: body.from,
      to: body.to,
      decision,
      ruleId: body.ruleId,
      customTo: body.customTo,
      tier: body.tier ?? "client",
      source: body.source,
      userEmail: session.user.email,
    });
    return NextResponse.json({
      ok: true,
      pair: {
        from: row.from,
        to: row.to,
        accepts: row.accepts,
        rejects: row.rejects,
        active: row.active,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "feedback failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
