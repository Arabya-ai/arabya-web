import { NextResponse } from "next/server";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/require-role";
import {
  loadAdminSiteAppearance,
  saveAdminSiteAppearance,
} from "@/lib/site-appearance-store";
import { normalizeSiteAppearance } from "@/lib/site-appearance";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("admin-appearance", gate.email, 60);
  if (limited) return limited;
  try {
    const data = await loadAdminSiteAppearance(gate.email);
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function PATCH(request: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("admin-appearance", gate.email, 30);
  if (limited) return limited;
  let body: { footerCreditAr?: string; footerCreditEn?: string };
  try {
    body = (await request.json()) as {
      footerCreditAr?: string;
      footerCreditEn?: string;
    };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const normalized = normalizeSiteAppearance({
    footerCreditAr: body.footerCreditAr,
    footerCreditEn: body.footerCreditEn,
  });

  try {
    const saved = await saveAdminSiteAppearance(gate.email, normalized);
    return NextResponse.json({ ok: true, ...saved });
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    // Local file write may fail on read-only hosts without sync.
    if (message.includes("EROFS") || message.includes("read-only")) {
      return NextResponse.json(
        {
          ok: false,
          error: "cloud_required",
          message:
            "Saving appearance on production needs user sync. Enable ARABYA_USER_SYNC_ENABLED on the server.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
