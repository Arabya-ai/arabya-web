"use client";

import "@/styles/ops-monitor.css";
import { useCallback, useEffect, useState } from "react";

type Alert = {
  id: string;
  level: "info" | "warn" | "critical";
  area: string;
  messageAr: string;
  at: string;
};

type Integration = {
  id: string;
  nameAr: string;
  nameEn: string;
  role: string;
  license: string;
  repo: string;
  status: string;
  features: string[];
  notesAr?: string;
  health?: { ok: boolean; ms: number; detail?: string };
};

type Snapshot = {
  generatedAt: string;
  site: { userSyncEnabled: boolean; nodeEnv: string };
  lughawi: {
    engineVersion: string;
    projectPoolCount: number;
    projectPoolByProvider: Record<string, number>;
    hasLocalOllama: boolean;
    learning: { pairs?: number; active?: number; suppressed?: number };
  };
  aiUsage: {
    month: string;
    slots: Array<{
      provider: string;
      keyTail: string;
      label?: string;
      tokensMonth: number;
      requestsMonth: number;
      remainingPct: number;
      alert?: string;
    }>;
    alerts: Array<{ level: string; messageAr: string }>;
  };
  integrations: Integration[];
  alerts: Alert[];
};

const STATUS_AR: Record<string, string> = {
  wired: "مدمج ويعمل",
  planned_sidecar: "مخطط (sidecar)",
  research_only: "بحثي فقط",
  deferred: "مؤجّل",
};

export function AdminOpsMonitor() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ops", { cache: "no-store" });
      const json = (await res.json()) as Snapshot & {
        ok?: boolean;
        error?: string;
      };
      if (!res.ok || json.ok === false) {
        setError(json.error || "تعذّر تحميل المراقبة");
        setData(null);
        return;
      }
      setData(json);
    } catch {
      setError("تعذّر الاتصال بواجهة المراقبة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (loading && !data) {
    return <p className="dash-muted">جاري تحميل لوحة المراقبة…</p>;
  }
  if (error && !data) {
    return (
      <p className="dash-banner dash-banner--warn" role="alert">
        {error}
      </p>
    );
  }
  if (!data) return null;

  const critical = data.alerts.filter((a) => a.level === "critical");
  const warns = data.alerts.filter((a) => a.level === "warn");

  return (
    <div className="ops-monitor dash-stack">
      <div className="ops-monitor__head">
        <p className="dash-muted" dir="ltr">
          آخر تحديث: {new Date(data.generatedAt).toLocaleString("ar-EG")}
        </p>
        <button type="button" className="dash-btn" onClick={() => void load()}>
          تحديث الآن
        </button>
      </div>

      {critical.length > 0 || warns.length > 0 ? (
        <section className="ops-alerts" aria-label="تنبيهات">
          <h2>التنبيهات</h2>
          <ul>
            {data.alerts.map((a) => (
              <li
                key={a.id}
                className={`ops-alert ops-alert--${a.level}`}
              >
                <strong>{a.area}</strong> — {a.messageAr}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="dash-banner">لا تنبيهات حرجة الآن.</p>
      )}

      <section className="ops-cards" aria-label="صحة النظام">
        <article>
          <h3>لغوي</h3>
          <p>
            المحرك <span dir="ltr">{data.lughawi.engineVersion}</span>
          </p>
          <p>مفاتيح المشروع: {data.lughawi.projectPoolCount}</p>
          <p>
            Ollama المحلي:{" "}
            {data.lughawi.hasLocalOllama ? "مفعّل" : "غير مضبوط"}
          </p>
          <p>
            Sidecar:{" "}
            {data.lughawi.sidecar?.ok
              ? `متصل (${data.lughawi.sidecar.ms}ms · v${data.lughawi.sidecar.version ?? "?"})`
              : "غير متصل"}
          </p>
          <p dir="ltr">
            {Object.entries(data.lughawi.projectPoolByProvider)
              .map(([k, v]) => `${k}:${v}`)
              .join(" · ") || "—"}
          </p>
        </article>
        <article>
          <h3>الحسابات</h3>
          <p>
            مزامنة المستخدمين:{" "}
            {data.site.userSyncEnabled ? "مفعّلة" : "متوقفة"}
          </p>
          <p dir="ltr">NODE_ENV={data.site.nodeEnv}</p>
        </article>
        <article>
          <h3>استخدام الذكاء ({data.aiUsage.month})</h3>
          <p>فتحات مسجّلة: {data.aiUsage.slots.length}</p>
          {data.aiUsage.slots.length === 0 ? (
            <p className="dash-muted">لا استخدام مسجّل بعد هذا الشهر.</p>
          ) : (
            <ul className="ops-usage-list">
              {data.aiUsage.slots.slice(0, 12).map((s) => (
                <li key={`${s.provider}-${s.keyTail}`}>
                  <span dir="ltr">
                    {s.provider}…{s.keyTail}
                  </span>
                  {" — "}
                  {s.remainingPct}% متبقٍ · {s.requestsMonth} طلب
                  {s.alert && s.alert !== "ok" ? ` · ${s.alert}` : ""}
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section aria-label="المشاريع المدمجة">
        <h2>المشاريع والأدوات الخارجية</h2>
        <p className="dash-muted">
          راجع القائمة يوميًا. عند ظهور تحديث على GitHub لأي أداة «مراقبة»،
          اطلب من الوكيل تحديث الدمج.
        </p>
        <div className="ops-table-wrap">
          <table className="ops-table">
            <thead>
              <tr>
                <th>الأداة</th>
                <th>الحالة</th>
                <th>الترخيص</th>
                <th>الصحة</th>
                <th>المستودع</th>
              </tr>
            </thead>
            <tbody>
              {data.integrations.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.nameAr}</strong>
                    <br />
                    <span className="dash-muted">{row.role}</span>
                  </td>
                  <td>{STATUS_AR[row.status] ?? row.status}</td>
                  <td>{row.license}</td>
                  <td>
                    {row.health
                      ? row.health.ok
                        ? `سليم (${row.health.ms}ms)`
                        : `فشل: ${row.health.detail ?? ""}`
                      : "—"}
                  </td>
                  <td>
                    <a href={row.repo} target="_blank" rel="noreferrer">
                      رابط
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
