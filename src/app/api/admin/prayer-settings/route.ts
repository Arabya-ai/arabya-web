import { NextResponse } from "next/server";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/require-role";
import {
  readPrayerDefaults,
  writePrayerDefaults,
} from "@/lib/prayer-defaults-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("admin-prayer-settings", gate.email, 60);
  if (limited) return limited;
  const settings = readPrayerDefaults();
  return NextResponse.json({ ok: true, settings });
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("admin-prayer-settings", gate.email, 30);
  if (limited) return limited;

  let body: { method?: number; school?: number };
  try {
    body = (await req.json()) as { method?: number; school?: number };
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }
  if (typeof body.method !== "number" || typeof body.school !== "number") {
    return NextResponse.json(
      { ok: false, error: "invalid_payload" },
      { status: 400 },
    );
  }

  const settings = writePrayerDefaults(gate.email, {
    method: body.method,
    school: body.school,
  });
  return NextResponse.json({ ok: true, settings });
}
