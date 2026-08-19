import { NextResponse } from "next/server";
import {
  getAdhkarCategories,
  getAdhkarCategory,
  getDuas,
  type AdhkarItem,
  type DuaItem,
} from "@/lib/adhkar";
import { readAdhkarContentOverride, writeAdhkarContentOverride } from "@/lib/adhkar-content-store";
import { requireEditorial } from "@/lib/require-role";
import { enforceRateLimitKey } from "@/lib/rate-limit";
const MAX_EDITOR_BODY_BYTES = 120_000;

function requestTooLarge(request: Request, maxBytes: number): boolean {
  const raw = request.headers.get("content-length");
  if (!raw) return false;
  const bytes = Number(raw);
  return Number.isFinite(bytes) && bytes > maxBytes;
}

type AdhkarPayload = {
  slug: string;
  item: {
    id: string;
    textAr: string;
    repeat: number;
    source?: string;
    fadlAr?: string;
    fadlEn?: string;
  };
};

type DuaPayload = {
  item: {
    id: string;
    categoryAr: string;
    categoryEn: string;
    textAr: string;
    source?: string;
  };
};

async function currentCollections() {
  const categories = await getAdhkarCategories();
  const adhkarBySlug: Record<string, AdhkarItem[]> = {};
  for (const c of categories) {
    const full = await getAdhkarCategory(c.slug);
    adhkarBySlug[c.slug] = full?.items ?? [];
  }
  const duas = await getDuas();
  return { categories, adhkarBySlug, duas: duas as DuaItem[] };
}

export async function GET() {
  const gate = await requireEditorial();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("editor-adhkar-content", gate.email, 80);
  if (limited) return limited;
  const { categories, adhkarBySlug, duas } = await currentCollections();
  const override = readAdhkarContentOverride();
  return NextResponse.json({
    ok: true,
    categories,
    adhkarBySlug,
    duas,
    overrideUpdatedAt: override?.updatedAt ?? null,
    overrideUpdatedBy: override?.updatedBy ?? null,
  });
}

export async function PATCH(req: Request) {
  const gate = await requireEditorial();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("editor-adhkar-content", gate.email, 50);
  if (limited) return limited;
  if (requestTooLarge(req, MAX_EDITOR_BODY_BYTES)) {
    return NextResponse.json({ ok: false, error: "payload_too_large" }, { status: 413 });
  }

  let body:
    | {
        type: "adhkar";
        action: "upsert" | "archive";
        payload: AdhkarPayload;
      }
    | {
        type: "dua";
        action: "upsert" | "archive";
        payload: DuaPayload;
      };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const { adhkarBySlug, duas } = await currentCollections();

  if (body.type === "adhkar") {
    const { slug, item } = body.payload;
    const list = [...(adhkarBySlug[slug] ?? [])];
    const idx = list.findIndex((x) => x.id === item.id);
    if (body.action === "archive") {
      if (idx >= 0) list[idx] = { ...list[idx], active: false };
    } else {
      const next = {
        id: item.id.trim(),
        textAr: item.textAr.trim(),
        repeat: Math.max(1, Number(item.repeat) || 1),
        source: item.source?.trim() || undefined,
        fadlAr: item.fadlAr?.trim() || undefined,
        fadlEn: item.fadlEn?.trim() || undefined,
        active: true,
      };
      if (!next.id || !next.textAr) {
        return NextResponse.json(
          { ok: false, error: "invalid_item" },
          { status: 400 },
        );
      }
      if (idx >= 0) list[idx] = next;
      else list.unshift(next);
    }
    adhkarBySlug[slug] = list;
  } else {
    const list = [...duas];
    const item = body.payload.item;
    const idx = list.findIndex((x) => x.id === item.id);
    if (body.action === "archive") {
      if (idx >= 0) list[idx] = { ...list[idx], active: false };
    } else {
      const next = {
        id: item.id.trim(),
        textAr: item.textAr.trim(),
        categoryAr: item.categoryAr.trim(),
        categoryEn: item.categoryEn.trim() || item.categoryAr.trim(),
        source: item.source?.trim() || undefined,
        active: true,
      };
      if (!next.id || !next.textAr || !next.categoryAr) {
        return NextResponse.json(
          { ok: false, error: "invalid_item" },
          { status: 400 },
        );
      }
      if (idx >= 0) list[idx] = next;
      else list.unshift(next);
    }
    writeAdhkarContentOverride(gate.email, { adhkarBySlug, duas: list });
    return NextResponse.json({ ok: true });
  }

  writeAdhkarContentOverride(gate.email, { adhkarBySlug, duas });
  return NextResponse.json({ ok: true });
}
