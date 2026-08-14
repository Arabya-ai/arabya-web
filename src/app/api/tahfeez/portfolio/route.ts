import { NextResponse } from "next/server";
import {
  appendTahfeezSession,
  getTahfeezPortfolio,
  isCloudSyncConfigured,
  saveTahfeezPortfolio,
} from "@/lib/cloud-sync";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireSession } from "@/lib/require-role";
import {
  emptyTahfeezPortfolio,
  type TahfeezPortfolio,
  type TahfeezSessionSummary,
} from "@/lib/tahfeez/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("tahfeez-portfolio-get", gate.email, 60);
  if (limited) return limited;

  if (!isCloudSyncConfigured()) {
    return NextResponse.json({
      ok: true,
      configured: false,
      portfolio: emptyTahfeezPortfolio(),
    });
  }

  const portfolio = await getTahfeezPortfolio(gate.email);
  return NextResponse.json({ ok: true, configured: true, portfolio });
}

export async function PUT(request: Request) {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("tahfeez-portfolio-put", gate.email, 30);
  if (limited) return limited;

  if (!isCloudSyncConfigured()) {
    return NextResponse.json(
      { ok: false, error: "not_configured" },
      { status: 503 },
    );
  }

  let body: {
    portfolio?: TahfeezPortfolio;
    session?: TahfeezSessionSummary;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const user = {
    email: gate.email,
    name: gate.name,
    image: gate.image,
  };

  try {
    if (body.session) {
      const portfolio = await appendTahfeezSession(user, body.session);
      return NextResponse.json({ ok: true, portfolio });
    }
    if (body.portfolio) {
      const portfolio = await saveTahfeezPortfolio(user, body.portfolio);
      return NextResponse.json({ ok: true, portfolio });
    }
    return NextResponse.json({ ok: false, error: "missing_body" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "save_failed";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  }
}
