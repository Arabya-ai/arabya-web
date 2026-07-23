"use client";

import { useEffect, useState } from "react";

type RequestState = {
  id: string;
  status: string;
  message?: string;
  reviewNote?: string | null;
} | null;

export function RoleRequestPanel({ canRequest }: { canRequest: boolean }) {
  const [request, setRequest] = useState<RequestState>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/account/role-request", { cache: "no-store" });
        const data = (await res.json()) as { request?: RequestState; error?: string };
        if (!cancelled) {
          setRequest(data.request ?? null);
          setLoaded(true);
        }
      } catch {
        if (!cancelled) {
          setRequest(null);
          setLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canRequest) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/role-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; id?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "تعذّر إرسال الطلب");
      }
      setRequest({ id: data.id || "", status: "pending", message });
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ");
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <section id="role-request" className="dash-card">
        <h2>طلب ترقية إلى محرر</h2>
        <p className="dash-muted">جاري التحميل…</p>
      </section>
    );
  }

  const status = request?.status;

  return (
    <section id="role-request" className="dash-card">
      <h2>طلب ترقية إلى محرر</h2>
      <p className="dash-muted">
        المحرر يساعد في مراجعة جودة المحتوى والمصادر. الترقية تتم بعد موافقة
        المدير فقط.
      </p>

      {!canRequest ? (
        <p className="dash-banner dash-banner--ok">لديك صلاحية محرر أو أعلى بالفعل.</p>
      ) : status === "pending" ? (
        <p className="dash-banner">طلبك قيد المراجعة من المدير.</p>
      ) : status === "approved" ? (
        <p className="dash-banner dash-banner--ok">
          تمت الموافقة. أعد تسجيل الدخول أو انتظر دقائق لتحديث الصلاحية.
        </p>
      ) : status === "rejected" ? (
        <div>
          <p className="dash-banner dash-banner--warn">
            رُفض الطلب السابق
            {request?.reviewNote ? `: ${request.reviewNote}` : "."}
          </p>
          <form className="dash-form" onSubmit={submit}>
            <label>
              رسالة جديدة للمدير
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={500}
                required
              />
            </label>
            <button type="submit" className="auth-btn auth-btn--google" disabled={busy}>
              {busy ? "…" : "إعادة الطلب"}
            </button>
          </form>
        </div>
      ) : (
        <form className="dash-form" onSubmit={submit}>
          <label>
            لماذا تريد صلاحية المحرر؟
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="مثال: أراجع مصادر الإعراب والدلالة…"
              required
            />
          </label>
          {error ? <p className="dash-banner dash-banner--warn">{error}</p> : null}
          <button type="submit" className="auth-btn auth-btn--google" disabled={busy}>
            {busy ? "…" : "إرسال طلب الترقية"}
          </button>
        </form>
      )}
    </section>
  );
}
