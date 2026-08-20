import { recordFeedback } from "@/lib/lughawi/learning-store";
import { enforceRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/** Crowd learn: accept/reject a proposed correction. Works for guests too. */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, { prefix: "lughawi-feedback", limit: 80 });
  if (limited) return limited;

  let body: {
    from?: string;
    to?: string;
    decision?: string;
    ruleId?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const decision =
    body.decision === "accepted" || body.decision === "rejected"
      ? body.decision
      : null;
  if (!decision || !body.from?.trim() || !body.to?.trim()) {
    return NextResponse.json({ error: "from, to, decision required" }, { status: 400 });
  }

  try {
    const row = recordFeedback({
      from: body.from,
      to: body.to,
      decision,
      ruleId: body.ruleId,
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
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "feedback failed" },
      { status: 400 },
    );
  }
}
