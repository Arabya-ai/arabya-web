import { NextResponse } from "next/server";
import {
  addAdminPoolKey,
  adminPoolSummary,
  bulkAddAdminPoolKeys,
  deleteAdminPoolKey,
  listAdminPoolPublic,
  updateAdminPoolKey,
} from "@/lib/lughawi/admin-pool-store";
import { usageSummary } from "@/lib/ops/usage-meter";
import { quotaLeaderboard } from "@/lib/lughawi/quota-store";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/require-role";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("admin-lughawi-keys", gate.email, 60);
  if (limited) return limited;

  return NextResponse.json({
    ok: true,
    summary: adminPoolSummary(),
    slots: listAdminPoolPublic(),
    usage: usageSummary(),
    topUsers: quotaLeaderboard(40),
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("admin-lughawi-keys-write", gate.email, 40);
  if (limited) return limited;

  let body: {
    mode?: "single" | "bulk";
    provider?: string;
    apiKey?: string;
    label?: string;
    model?: string;
    baseUrl?: string;
    text?: string;
    defaultProvider?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON غير صالح" }, { status: 400 });
  }

  try {
    if (body.mode === "bulk" || (body.text && body.text.trim())) {
      const result = bulkAddAdminPoolKeys({
        text: body.text ?? "",
        defaultProvider: body.defaultProvider ?? body.provider ?? "google",
        createdBy: gate.email,
      });
      return NextResponse.json({
        ok: true,
        ...result,
        slots: listAdminPoolPublic(),
        summary: adminPoolSummary(),
      });
    }

    if (!body.provider || !body.apiKey) {
      return NextResponse.json(
        { ok: false, error: "اختر المزود والصق المفتاح" },
        { status: 400 },
      );
    }
    const created = addAdminPoolKey({
      provider: body.provider,
      apiKey: body.apiKey,
      label: body.label,
      model: body.model,
      baseUrl: body.baseUrl,
      createdBy: gate.email,
    });
    return NextResponse.json({
      ok: true,
      ...created,
      slots: listAdminPoolPublic(),
      summary: adminPoolSummary(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشل الحفظ";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("admin-lughawi-keys-write", gate.email, 40);
  if (limited) return limited;

  let body: {
    id?: string;
    label?: string;
    model?: string;
    baseUrl?: string;
    enabled?: boolean;
    apiKey?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON غير صالح" }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ ok: false, error: "معرّف ناقص" }, { status: 400 });
  }
  try {
    const ok = updateAdminPoolKey(body.id, body);
    if (!ok) {
      return NextResponse.json({ ok: false, error: "المفتاح غير موجود" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      slots: listAdminPoolPublic(),
      summary: adminPoolSummary(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "فشل التعديل";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("admin-lughawi-keys-write", gate.email, 40);
  if (limited) return limited;

  const url = new URL(req.url);
  const id = url.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ ok: false, error: "معرّف ناقص" }, { status: 400 });
  }
  const ok = deleteAdminPoolKey(id);
  if (!ok) {
    return NextResponse.json({ ok: false, error: "المفتاح غير موجود" }, { status: 404 });
  }
  return NextResponse.json({
    ok: true,
    slots: listAdminPoolPublic(),
    summary: adminPoolSummary(),
  });
}
