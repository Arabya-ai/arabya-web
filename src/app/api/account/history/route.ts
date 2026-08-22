import { NextResponse } from "next/server";
import { clearAccountHistory, isCloudSyncConfigured } from "@/lib/cloud-sync";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireSession } from "@/lib/require-role";

export const dynamic = "force-dynamic";

type Scope = "study" | "tahfeez" | "all";

function parseScope(raw: string | null): Scope | null {
  if (raw === "study" || raw === "tahfeez" || raw === "all") return raw;
  return null;
}

/** DELETE /api/account/history?scope=study|tahfeez|all */
export async function DELETE(req: Request) {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("account-history", gate.email, 20);
  if (limited) return limited;

  if (!isCloudSyncConfigured()) {
    return NextResponse.json({ ok: false, error: "not_configured" }, { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const scope = parseScope(searchParams.get("scope"));
  if (!scope) {
    return NextResponse.json(
      { ok: false, error: "invalid_scope", message: "Use scope=study|tahfeez|all" },
      { status: 400 },
    );
  }

  try {
    const result = await clearAccountHistory(
      {
        email: gate.email,
        name: gate.name,
        image: gate.image,
      },
      scope,
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "clear_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
