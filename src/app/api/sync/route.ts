import { auth } from "@/auth";
import { isCloudSyncConfigured, pullCloudSync, pushCloudSync } from "@/lib/cloud-sync";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isCloudSyncConfigured()) {
    return NextResponse.json(
      { ok: false, error: "not_configured", message: "مزامنة D1 غير مفعّلة بعد على السيرفر." },
      { status: 503 },
    );
  }

  try {
    const data = await pullCloudSync({
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
    });
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "pull_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  if (!isCloudSyncConfigured()) {
    return NextResponse.json(
      { ok: false, error: "not_configured", message: "مزامنة D1 غير مفعّلة بعد على السيرفر." },
      { status: 503 },
    );
  }

  let body: {
    bookmarks?: unknown;
    notes?: unknown;
    progress?: { lastPage?: number | null; habit?: unknown };
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  try {
    const data = await pushCloudSync(
      {
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      },
      {
        bookmarks: Array.isArray(body.bookmarks) ? (body.bookmarks as never) : [],
        notes: Array.isArray(body.notes) ? (body.notes as never) : [],
        progress: {
          lastPage: body.progress?.lastPage ?? null,
          habit: (body.progress?.habit as never) || {},
        },
      },
    );
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "push_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
