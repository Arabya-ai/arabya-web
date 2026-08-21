import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireAdmin } from "@/lib/require-role";
import { fetchSentryIssues, getSentryStatus } from "@/lib/sentry/status";

export const dynamic = "force-dynamic";

export async function GET() {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("admin-ops-sentry", gate.email, 30);
  if (limited) return limited;

  const status = getSentryStatus();
  const issuesResult = status.issuesFetchable
    ? await fetchSentryIssues(25)
    : { ok: true as const, issues: [] };

  return NextResponse.json({
    ok: true,
    status,
    issues: issuesResult.issues,
    issuesError: issuesResult.ok ? undefined : issuesResult.error,
  });
}

export async function POST(req: Request) {
  const gate = await requireAdmin();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("admin-ops-sentry-post", gate.email, 10);
  if (limited) return limited;

  const status = getSentryStatus();
  if (!status.configured) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Sentry غير مضبوط — أضف NEXT_PUBLIC_SENTRY_DSN على Contabo ثم pm2 restart arabya-web --update-env",
      },
      { status: 400 },
    );
  }

  let action = "test";
  try {
    const body = (await req.json()) as { action?: string };
    if (body.action) action = body.action;
  } catch {
    /* empty body ok */
  }

  if (action !== "test") {
    return NextResponse.json({ ok: false, error: "unknown action" }, { status: 400 });
  }

  const eventId = Sentry.captureMessage(
    "Arabya admin test event (Contabo /admin/ops?tab=sentry)",
    {
      level: "info",
      tags: {
        source: "admin-ops-sentry-test",
        actor: gate.email,
      },
    },
  );
  await Sentry.flush(2000);

  return NextResponse.json({ ok: true, eventId });
}
