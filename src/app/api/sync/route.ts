import { isCloudSyncConfigured, pullCloudSync, pushCloudSync } from "@/lib/cloud-sync";
import { sanitizeAdhkarMap, sanitizeTasbeehState } from "@/lib/adhkar-sync";
import { bodyTextTooLarge, requestTooLarge } from "@/lib/api-error";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireSession } from "@/lib/require-role";
import type { StudyEntry } from "@/lib/study-archive";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Soft cap for account sync payloads (bookmarks/notes/study/progress). */
const SYNC_PUT_MAX_BYTES = 1_500_000;

export async function GET() {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("sync", gate.email, 60);
  if (limited) return limited;

  if (!isCloudSyncConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "not_configured",
        message: "مزامنة الحساب غير مفعّلة بعد على السيرفر.",
      },
      { status: 503 },
    );
  }

  try {
    const data = await pullCloudSync({
      email: gate.email,
      name: gate.name,
      image: gate.image,
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "pull_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("sync", gate.email, 60);
  if (limited) return limited;

  if (!isCloudSyncConfigured()) {
    return NextResponse.json(
      {
        ok: false,
        error: "not_configured",
        message: "مزامنة الحساب غير مفعّلة بعد على السيرفر.",
      },
      { status: 503 },
    );
  }

  if (requestTooLarge(request, SYNC_PUT_MAX_BYTES)) {
    return NextResponse.json(
      { ok: false, error: "payload_too_large" },
      { status: 413 },
    );
  }

  let body: {
    bookmarks?: unknown;
    notes?: unknown;
    study?: unknown;
    progress?: {
      lastPage?: number | null;
      habit?: unknown;
      adhkar?: Record<string, number>;
      tasbeeh?: { phraseId: string; count: number };
    };
  };
  try {
    const rawText = await request.text();
    if (bodyTextTooLarge(rawText, SYNC_PUT_MAX_BYTES)) {
      return NextResponse.json(
        { ok: false, error: "payload_too_large" },
        { status: 413 },
      );
    }
    body = JSON.parse(rawText) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    const data = await pushCloudSync(
      {
        email: gate.email,
        name: gate.name,
        image: gate.image,
      },
      {
        bookmarks: Array.isArray(body.bookmarks) ? (body.bookmarks as never) : [],
        notes: Array.isArray(body.notes) ? (body.notes as never) : [],
        study: Array.isArray(body.study) ? (body.study as StudyEntry[]) : [],
        progress: {
          lastPage: body.progress?.lastPage ?? null,
          habit: (body.progress?.habit as never) || {},
          adhkar: sanitizeAdhkarMap(body.progress?.adhkar),
          tasbeeh: sanitizeTasbeehState(body.progress?.tasbeeh),
        },
      },
    );
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "push_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
