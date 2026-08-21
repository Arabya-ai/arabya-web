/** Sentry status + Issues API for super-admin ops (Contabo). */

export type SentryIssueRow = {
  id: string;
  shortId: string;
  title: string;
  culprit: string;
  count: string;
  userCount: number;
  lastSeen: string;
  firstSeen: string;
  level: string;
  permalink: string;
  status: string;
};

export type SentryStatus = {
  configured: boolean;
  sdkEnabled: boolean;
  dsnHost: string | null;
  org: string | null;
  project: string | null;
  authConfigured: boolean;
  orgSlug: string | null;
  projectSlug: string | null;
  issuesFetchable: boolean;
  messageAr: string;
};

function dsnHost(dsn: string | undefined): string | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    return u.host || null;
  } catch {
    // sentry DSN form: https://key@o123.ingest.sentry.io/456
    const m = dsn.match(/@([^/]+)/);
    return m?.[1] ?? null;
  }
}

export function getSentryStatus(): SentryStatus {
  const publicDsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || "";
  const serverDsn = process.env.SENTRY_DSN?.trim() || publicDsn;
  const org = process.env.SENTRY_ORG?.trim() || null;
  const project = process.env.SENTRY_PROJECT?.trim() || null;
  const auth = Boolean(process.env.SENTRY_AUTH_TOKEN?.trim());
  const configured = Boolean(serverDsn);
  const issuesFetchable = Boolean(auth && org && project);

  let messageAr: string;
  if (!configured) {
    messageAr =
      "Sentry غير مفعّل بعد. أضف NEXT_PUBLIC_SENTRY_DSN (وSENTRY_DSN) في .env على Contabo ثم أعد تشغيل PM2.";
  } else if (!issuesFetchable) {
    messageAr =
      "التقاط الأخطاء مفعّل، لكن قراءة قائمة المشاكل تحتاج SENTRY_AUTH_TOKEN + SENTRY_ORG + SENTRY_PROJECT.";
  } else {
    messageAr = "Sentry جاهز: الالتقاط وقراءة المشاكل للسوبر أدمن متاحان.";
  }

  return {
    configured,
    sdkEnabled:
      configured &&
      (process.env.NODE_ENV === "production" ||
        process.env.SENTRY_ENABLE_DEV === "1" ||
        process.env.NEXT_PUBLIC_SENTRY_ENABLE_DEV === "1"),
    dsnHost: dsnHost(serverDsn || undefined),
    org,
    project,
    authConfigured: auth,
    orgSlug: org,
    projectSlug: project,
    issuesFetchable,
    messageAr,
  };
}

export async function fetchSentryIssues(limit = 25): Promise<{
  ok: boolean;
  issues: SentryIssueRow[];
  error?: string;
}> {
  const status = getSentryStatus();
  if (!status.issuesFetchable || !status.orgSlug || !status.projectSlug) {
    return {
      ok: false,
      issues: [],
      error: status.messageAr,
    };
  }

  const token = process.env.SENTRY_AUTH_TOKEN!.trim();
  const host = (process.env.SENTRY_HOST || "sentry.io").replace(/\/$/, "");
  const url = `https://${host}/api/0/projects/${encodeURIComponent(status.orgSlug)}/${encodeURIComponent(status.projectSlug)}/issues/?query=is:unresolved&limit=${Math.min(Math.max(limit, 1), 50)}&sort=date`;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        issues: [],
        error: `Sentry API ${res.status}: ${body.slice(0, 200) || res.statusText}`,
      };
    }
    const data = (await res.json()) as Array<Record<string, unknown>>;
    const issues: SentryIssueRow[] = (Array.isArray(data) ? data : []).map((row) => ({
      id: String(row.id ?? ""),
      shortId: String(row.shortId ?? row.id ?? ""),
      title: String(row.title ?? "(بدون عنوان)"),
      culprit: String(row.culprit ?? ""),
      count: String(row.count ?? "0"),
      userCount: Number(row.userCount ?? 0),
      lastSeen: String(row.lastSeen ?? ""),
      firstSeen: String(row.firstSeen ?? ""),
      level: String(row.level ?? "error"),
      permalink: String(row.permalink ?? ""),
      status: String(row.status ?? ""),
    }));
    return { ok: true, issues };
  } catch (err) {
    return {
      ok: false,
      issues: [],
      error: err instanceof Error ? err.message : "sentry_fetch_failed",
    };
  }
}
