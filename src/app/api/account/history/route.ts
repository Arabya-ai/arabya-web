import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { clearAccountHistory, isCloudSyncConfigured } from "@/lib/cloud-sync";

export const dynamic = "force-dynamic";

type Scope = "study" | "tahfeez" | "all";

function parseScope(raw: string | null): Scope | null {
  if (raw === "study" || raw === "tahfeez" || raw === "all") return raw;
  return null;
}

/** DELETE /api/account/history?scope=study|tahfeez|all */
export async function DELETE(req: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user?.email) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
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
        email: user.email,
        name: user.name,
        image: user.image,
      },
      scope,
    );
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "clear_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
