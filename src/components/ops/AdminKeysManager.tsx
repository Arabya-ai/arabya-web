"use client";

import "@/styles/ops-monitor.css";
import { useCallback, useEffect, useState, useTransition } from "react";

type Slot = {
  id: string;
  provider: string;
  keyLast4: string;
  label: string;
  model?: string;
  enabled: boolean;
  createdAt: string;
  createdBy?: string;
};

type UsageSlot = {
  provider: string;
  keyTail: string;
  label?: string;
  tokensMonth: number;
  requestsMonth: number;
  remainingPct: number;
  failuresMonth?: number;
  lastError?: string;
  alert?: string;
};

type TopUser = {
  userId: string;
  usedWords: number;
  limitWords: number;
};

type Tab = "keys" | "usage" | "howto";

const PROVIDERS = [
  { id: "google", label: "Google (Gemini)" },
  { id: "openrouter", label: "OpenRouter" },
  { id: "openai", label: "OpenAI" },
  { id: "anthropic", label: "Anthropic (Claude)" },
  { id: "groq", label: "Groq" },
  { id: "ollama", label: "Ollama محلي" },
] as const;

export function AdminKeysManager() {
  const [tab, setTab] = useState<Tab>("keys");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [usage, setUsage] = useState<UsageSlot[]>([]);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [summary, setSummary] = useState<{ total: number; enabled: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [provider, setProvider] = useState("google");
  const [apiKey, setApiKey] = useState("");
  const [label, setLabel] = useState("");
  const [bulk, setBulk] = useState("");

  const load = useCallback(() => {
    startTransition(async () => {
      setError(null);
      try {
        const res = await fetch("/api/admin/lughawi-keys", { cache: "no-store" });
        const json = (await res.json()) as {
          ok?: boolean;
          error?: string;
          slots?: Slot[];
          summary?: { total: number; enabled: number };
          usage?: { slots: UsageSlot[] };
          topUsers?: TopUser[];
        };
        if (!res.ok || json.ok === false) {
          setError(json.error || "تعذّر التحميل");
          return;
        }
        setSlots(json.slots ?? []);
        setSummary(json.summary ?? null);
        setUsage(json.usage?.slots ?? []);
        setTopUsers(json.topUsers ?? []);
      } catch {
        setError("تعذّر الاتصال");
      }
    });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function addOne() {
    setFlash(null);
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/lughawi-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "single",
          provider,
          apiKey,
          label: label || undefined,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        slots?: Slot[];
        summary?: { total: number; enabled: number };
      };
      if (!res.ok || json.ok === false) {
        setError(json.error || "فشل الإضافة");
        return;
      }
      setSlots(json.slots ?? []);
      setSummary(json.summary ?? null);
      setApiKey("");
      setLabel("");
      setFlash("تم حفظ المفتاح مشفّرًا على السيرفر.");
    });
  }

  function addBulk() {
    setFlash(null);
    setError(null);
    startTransition(async () => {
      const res = await fetch("/api/admin/lughawi-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "bulk",
          text: bulk,
          defaultProvider: provider,
        }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        added?: number;
        skipped?: number;
        errors?: string[];
        slots?: Slot[];
        summary?: { total: number; enabled: number };
      };
      if (!res.ok || json.ok === false) {
        setError(json.error || "فشل الإضافة الجماعية");
        return;
      }
      setSlots(json.slots ?? []);
      setSummary(json.summary ?? null);
      setBulk("");
      setFlash(
        `أُضيف ${json.added ?? 0} · تخطّي مكرّر ${json.skipped ?? 0}` +
          (json.errors?.length ? ` · أخطاء: ${json.errors.length}` : ""),
      );
    });
  }

  function toggle(id: string, enabled: boolean) {
    startTransition(async () => {
      const res = await fetch("/api/admin/lughawi-keys", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, enabled }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        slots?: Slot[];
        summary?: { total: number; enabled: number };
      };
      if (res.ok && json.ok) {
        setSlots(json.slots ?? []);
        setSummary(json.summary ?? null);
      }
    });
  }

  function clearFailureHistory() {
    startTransition(async () => {
      setError(null);
      const res = await fetch("/api/admin/lughawi-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "clear-failures" }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        error?: string;
        usage?: { slots: UsageSlot[] };
      };
      if (!res.ok || json.ok === false) {
        setError(json.error || "تعذّر مسح سجل الفشل");
        return;
      }
      setUsage(json.usage?.slots ?? []);
      setFlash("تم مسح تنبيهات الفشل القديمة لمفاتيح غير النشطة.");
    });
  }

  function remove(id: string) {
    if (!window.confirm("حذف هذا المفتاح نهائيًا؟")) return;
    startTransition(async () => {
      const res = await fetch(`/api/admin/lughawi-keys?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        slots?: Slot[];
        summary?: { total: number; enabled: number };
      };
      if (res.ok && json.ok) {
        setSlots(json.slots ?? []);
        setSummary(json.summary ?? null);
        setFlash("تم الحذف.");
      }
    });
  }

  return (
    <div className="ops-keys dash-stack">
      <div className="ops-keys__tabs" role="tablist">
        {(
          [
            ["keys", "المفاتيح"],
            ["usage", "تقارير الاستخدام"],
            ["howto", "كيف أحصل على مفتاح؟"],
          ] as const
        ).map(([id, labelAr]) => (
          <button
            key={id}
            type="button"
            role="tab"
            className={tab === id ? "is-active" : undefined}
            onClick={() => setTab(id)}
          >
            {labelAr}
          </button>
        ))}
        <button type="button" className="dash-btn ops-keys__refresh" onClick={() => void load()}>
          تحديث
        </button>
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

      {tab === "keys" ? (
        <>
          <section className="ops-keys__card">
            <h2>إضافة مفتاح واحد</h2>
            <p className="dash-muted">
              المفتاح يُحفظ مشفّرًا ويعمل تلقائيًا لكل المشتركين المجانيين حتى{" "}
              <strong>1500 كلمة / شهر</strong> لكل مستخدم. بعد ذلك يطلب النظام مفتاح
              المستخدم.
            </p>
            <div className="ops-keys__form">
              <label>
                المزود
                <select
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  disabled={pending}
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                اسم اختياري (مثل جيميل-3)
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="gmail-1"
                  disabled={pending}
                />
              </label>
              <label className="ops-keys__full">
                المفتاح
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="الصق المفتاح هنا"
                  dir="ltr"
                  disabled={pending}
                  autoComplete="off"
                />
              </label>
              <button
                type="button"
                className="dash-btn"
                disabled={pending || apiKey.trim().length < 8}
                onClick={addOne}
              >
                حفظ مشفّرًا
              </button>
            </div>
          </section>

          <section className="ops-keys__card">
            <h2>إضافة دفعة (عشرات أو مئات)</h2>
            <p className="dash-muted">
              سطر لكل مفتاح. يمكنك كتابة{" "}
              <code dir="ltr">google:AIza…</code> أو{" "}
              <code dir="ltr">openai:sk-…</code> أو مفاتيح خام فقط (يُستخدم المزود
              المختار أعلاه).
            </p>
            <textarea
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              rows={8}
              dir="ltr"
              placeholder={"google:AIza...\nopenai:sk-...\nAIza..."}
              disabled={pending}
            />
            <button
              type="button"
              className="dash-btn"
              disabled={pending || !bulk.trim()}
              onClick={addBulk}
            >
              حفظ الدفعة مشفّرة
            </button>
          </section>

          <section className="ops-keys__card">
            <h2>
              المفاتيح المحفوظة{" "}
              {summary ? (
                <span className="dash-muted">
                  ({summary.enabled} مفعّل / {summary.total})
                </span>
              ) : null}
            </h2>
            {slots.length === 0 ? (
              <p className="dash-muted">لا مفاتيح بعد — أضف أول مفتاح أعلاه.</p>
            ) : (
              <div className="ops-table-wrap">
                <table className="ops-table">
                  <thead>
                    <tr>
                      <th>الاسم</th>
                      <th>المزود</th>
                      <th>آخر 4</th>
                      <th>الحالة</th>
                      <th>إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {slots.map((s) => (
                      <tr key={s.id}>
                        <td>{s.label}</td>
                        <td dir="ltr">{s.provider}</td>
                        <td dir="ltr">…{s.keyLast4}</td>
                        <td>{s.enabled ? "مفعّل" : "متوقف"}</td>
                        <td className="ops-keys__actions">
                          <button
                            type="button"
                            onClick={() => toggle(s.id, !s.enabled)}
                            disabled={pending}
                          >
                            {s.enabled ? "إيقاف" : "تفعيل"}
                          </button>
                          <button
                            type="button"
                            className="ops-keys__danger"
                            onClick={() => remove(s.id)}
                            disabled={pending}
                          >
                            حذف
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      ) : null}

      {tab === "usage" ? (
        <section className="ops-keys__card">
          <h2>استهلاك مفاتيح المشروع</h2>
          <p className="dash-muted">
            التنبيه الأحمر قد يبقى من مفتاح قديم محذوف في ملف الإحصاءات. استخدم
            الزر أدناه لمسح سجل الفشل العالق، أو راجع{" "}
            <code dir="ltr">lastError</code> في القائمة.
          </p>
          <button
            type="button"
            className="dash-btn"
            disabled={pending}
            onClick={() => clearFailureHistory()}
          >
            مسح تنبيهات الفشل العالقة
          </button>
          {usage.length === 0 ? (
            <p className="dash-muted">لا استخدام مسجّل بعد هذا الشهر.</p>
          ) : (
            <ul className="ops-usage-list">
              {usage.map((u) => {
                const alertClass =
                  u.alert && u.alert !== "ok"
                    ? u.remainingPct < 15 || u.alert === "failing"
                      ? "ops-usage-list__item--critical"
                      : "ops-usage-list__item--warn"
                    : "";
                return (
                  <li key={`${u.provider}-${u.keyTail}`} className={alertClass || undefined}>
                    <span dir="ltr">
                      {u.provider}…{u.keyTail}
                    </span>
                    {u.label ? ` (${u.label})` : ""} — متبقّي{" "}
                    <strong>{u.remainingPct}%</strong> · {u.requestsMonth} طلب
                    {typeof u.failuresMonth === "number" && u.failuresMonth > 0
                      ? ` · فشل: ${u.failuresMonth}`
                      : ""}
                    {u.alert && u.alert !== "ok" ? (
                      <span className="ops-usage-alert"> · تنبيه: {u.alert}</span>
                    ) : null}
                    {u.lastError ? (
                      <>
                        <br />
                        <span className="dash-muted" dir="ltr">
                          lastError: {u.lastError}
                        </span>
                      </>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="dash-muted" style={{ marginTop: "0.75rem" }}>
            الحصة المجانية للمستخدم: <strong>1500 كلمة / شهر</strong> على مفاتيح
            المشروع، ثم يطلب مفتاحه الخاص.
          </p>
          <h2 style={{ marginTop: "1.25rem" }}>أعلى المستخدمين استهلاكًا (كلمات مجانية)</h2>
          {topUsers.length === 0 ? (
            <p className="dash-muted">لا بيانات مستخدمين بعد.</p>
          ) : (
            <div className="ops-table-wrap">
              <table className="ops-table">
                <thead>
                    <tr>
                      <th>البريد</th>
                      <th>كلمات مستخدمة</th>
                      <th>الحد</th>
                    </tr>
                </thead>
                <tbody>
                  {topUsers.map((u) => (
                    <tr key={u.userId}>
                      <td dir="ltr">{u.userId}</td>
                      <td>{u.usedWords}</td>
                      <td>{u.limitWords}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : null}

      {tab === "howto" ? (
        <section className="ops-keys__card ops-keys__howto">
          <h2>Google (الأسهل — ابدأ هنا)</h2>
          <ol>
            <li>
              افتح{" "}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">
                aistudio.google.com/apikey
              </a>{" "}
              من المتصفح.
            </li>
            <li>سجّل الدخول بجيميل.</li>
            <li>اضغط Create API key وانسخ المفتاح.</li>
            <li>ارجع لتبويب «المفاتيح» هنا والصقه ثم «حفظ مشفّرًا».</li>
            <li>كرّر بجيميلات أخرى إن أردت عشرات المفاتيح.</li>
          </ol>
          <h2>OpenRouter</h2>
          <ol>
            <li>
              افتح{" "}
              <a href="https://openrouter.ai/keys" target="_blank" rel="noreferrer">
                openrouter.ai/keys
              </a>
            </li>
            <li>Create Key → انسخ → الصق هنا مع اختيار OpenRouter.</li>
          </ol>
          <h2>OpenAI / Anthropic</h2>
          <p className="dash-muted">
            من منصة كل مزود أنشئ مفتاح API ثم الصقه هنا بنفس الطريقة. لا حاجة لملفات
            أو أوامر على السيرفر.
          </p>
        </section>
      ) : null}
    </div>
  );
}
