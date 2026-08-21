"use client";

import "@/styles/ops-monitor.css";
import { useCallback, useEffect, useState, useTransition } from "react";

type SentryStatus = {
  configured: boolean;
  sdkEnabled: boolean;
  dsnHost: string | null;
  org: string | null;
  project: string | null;
  authConfigured: boolean;
  issuesFetchable: boolean;
  messageAr: string;
};

type Issue = {
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

/**
 * Super-admin Sentry panel — lives under /admin/ops tab «الأخطاء».
 */
export function AdminSentryPanel() {
  const [status, setStatus] = useState<SentryStatus | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(() => {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/admin/ops/sentry", { cache: "no-store" });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          status?: SentryStatus;
          issues?: Issue[];
        };
        if (!res.ok || json.ok === false) {
          setError(json.error || "تعذّر تحميل Sentry");
          return;
        }
        setStatus(json.status ?? null);
        setIssues(json.issues ?? []);
      } catch {
        setError("تعذّر الاتصال بواجهة Sentry");
      }
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function sendTest() {
    startTransition(async () => {
      setFlash(null);
      setError(null);
      try {
        const res = await fetch("/api/admin/ops/sentry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "test" }),
        });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          eventId?: string;
        };
        if (!res.ok || json.ok === false) {
          setError(json.error || "فشل إرسال حدث الاختبار");
          return;
        }
        setFlash(
          json.eventId
            ? `أُرسل حدث اختبار — eventId: ${json.eventId}`
            : "أُرسل حدث اختبار (تحقق من لوحة Sentry خلال دقيقة).",
        );
        window.setTimeout(() => void load(), 2500);
      } catch {
        setError("فشل إرسال حدث الاختبار");
      }
    });
  }

  return (
    <div className="ops-sentry dash-stack">
      <div className="ops-monitor__head">
        <div>
          <h2 className="ops-sentry__title">Sentry — تتبع الأخطاء</h2>
          <p className="dash-muted">
            مراقبة أعطال Contabo (Next.js + واجهات API) للسوبر أدمن فقط.
          </p>
        </div>
        <div className="ops-sentry__actions">
          <button
            type="button"
            className="dash-btn"
            disabled={pending}
            onClick={() => void load()}
          >
            تحديث
          </button>
          <button
            type="button"
            className="dash-btn dash-btn--primary"
            disabled={pending || !status?.configured}
            onClick={() => sendTest()}
          >
            إرسال خطأ تجريبي
          </button>
        </div>
      </div>

      {error ? (
        <p className="dash-banner dash-banner--warn" role="alert">
          {error}
        </p>
      ) : null}
      {flash ? (
        <p className="dash-banner" role="status">
          {flash}
        </p>
      ) : null}

      {status ? (
        <section className="ops-cards" aria-label="حالة Sentry">
          <article>
            <h3>التفعيل</h3>
            <p>{status.configured ? "DSN مضبوط" : "DSN غير مضبوط"}</p>
            <p>SDK: {status.sdkEnabled ? "يعمل" : "متوقف (أو وضع تطوير)"}</p>
            <p className="dash-muted" dir="ltr">
              host: {status.dsnHost ?? "—"}
            </p>
          </article>
          <article>
            <h3>قراءة المشاكل</h3>
            <p>
              {status.issuesFetchable
                ? "API جاهز"
                : status.authConfigured
                  ? "ناقص org/project"
                  : "ناقص Auth Token"}
            </p>
            <p className="dash-muted" dir="ltr">
              {status.org ?? "—"} / {status.project ?? "—"}
            </p>
          </article>
          <article>
            <h3>ملاحظة</h3>
            <p>{status.messageAr}</p>
          </article>
        </section>
      ) : (
        <p className="dash-muted">{pending ? "جاري التحميل…" : "—"}</p>
      )}

      <section aria-label="أحدث المشاكل">
        <h2>أحدث المشاكل غير المحلولة</h2>
        {issues.length === 0 ? (
          <p className="dash-muted">
            لا مشاكل معروضة بعد — إمّا لا توجد أخطاء، أو لم يُضبط رمز قراءة
            Sentry بعد.
          </p>
        ) : (
          <div className="ops-table-wrap">
            <table className="ops-table">
              <thead>
                <tr>
                  <th>المعرّف</th>
                  <th>العنوان</th>
                  <th>المستوى</th>
                  <th>العدد</th>
                  <th>آخر ظهور</th>
                  <th>رابط</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((issue) => (
                  <tr key={issue.id}>
                    <td dir="ltr">{issue.shortId}</td>
                    <td>
                      <strong>{issue.title}</strong>
                      {issue.culprit ? (
                        <>
                          <br />
                          <span className="dash-muted" dir="ltr">
                            {issue.culprit}
                          </span>
                        </>
                      ) : null}
                    </td>
                    <td>{issue.level}</td>
                    <td dir="ltr">{issue.count}</td>
                    <td dir="ltr">
                      {issue.lastSeen
                        ? new Date(issue.lastSeen).toLocaleString("ar-EG")
                        : "—"}
                    </td>
                    <td>
                      {issue.permalink ? (
                        <a href={issue.permalink} target="_blank" rel="noreferrer">
                          Sentry
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="ops-sentry__howto" aria-label="إعداد Contabo">
        <h2>إعداد سريع على Contabo</h2>
        <ol>
          <li>أنشئ مشروعًا في Sentry (Next.js).</li>
          <li>
            في <code dir="ltr">/var/www/arabya-web/.env</code> أضف:
            <pre className="ops-sentry__pre" dir="ltr">{`NEXT_PUBLIC_SENTRY_DSN=https://...@....ingest.sentry.io/...
SENTRY_DSN=https://...@....ingest.sentry.io/...
SENTRY_ORG=your-org
SENTRY_PROJECT=arabya-web
SENTRY_AUTH_TOKEN=sntrys_...
SENTRY_ENVIRONMENT=contabo`}</pre>
          </li>
          <li>
            ثم: <code dir="ltr">pm2 restart arabya-web --update-env</code>
          </li>
          <li>من هذا التبويب: «إرسال خطأ تجريبي» ثم «تحديث».</li>
        </ol>
      </section>
    </div>
  );
}
