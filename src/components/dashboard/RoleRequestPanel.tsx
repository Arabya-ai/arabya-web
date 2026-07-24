"use client";

import { useEffect, useState } from "react";
import type { UserRole } from "@/lib/roles";

type RequestState = {
  id: string;
  status: string;
  message?: string;
  reviewNote?: string | null;
  targetRole?: string;
} | null;

export function RoleRequestPanel({
  role,
}: {
  role: UserRole;
}) {
  const [request, setRequest] = useState<RequestState>(null);
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState<"editor" | "admin">(
    role === "editor" ? "admin" : "editor",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const canRequestEditor = role === "user";
  const canRequestAdmin = role === "editor";
  const canRequest = canRequestEditor || canRequestAdmin;

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
      const roleToSend = canRequestAdmin ? targetRole : "editor";
      const res = await fetch("/api/account/role-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, targetRole: roleToSend }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; id?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "تعذّر إرسال الطلب");
      }
      setRequest({
        id: data.id || "",
        status: "pending",
        message,
        targetRole: roleToSend,
      });
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
        <h2>طلب ترقية</h2>
        <p className="dash-muted">جاري التحميل…</p>
      </section>
    );
  }

  const status = request?.status;

  return (
    <section id="role-request" className="dash-card">
      <h2>طلب ترقية</h2>
      <p className="dash-muted">
        اطلب ترقية صلاحياتك. ترقية المحرر تتم بموافقة أي أدمن، وترقية المدير
        بموافقة السوبر أدمن فقط.
      </p>

      {!canRequest ? (
        <p className="dash-banner dash-banner--ok">
          حسابك بإدارة كاملة أو أعلى من طلب الترقية المتاح هنا.
        </p>
      ) : status === "pending" ? (
        <p className="dash-banner">
          طلبك قيد المراجعة
          {request?.targetRole ? ` (إلى: ${request.targetRole})` : ""}.
        </p>
      ) : status === "approved" ? (
        <p className="dash-banner dash-banner--ok">
          تمت الموافقة. انتظر قليلًا أو أعد الدخول لتحديث الصلاحية.
        </p>
      ) : (
        <form className="dash-form" onSubmit={submit}>
          {canRequestAdmin ? (
            <label>
              نوع الترقية
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as "editor" | "admin")}
              >
                <option value="admin">ترقية إلى مدير</option>
              </select>
            </label>
          ) : (
            <p className="dash-muted">الطلب: ترقية إلى محرر</p>
          )}
          <label>
            رسالة للمدير
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="اكتب سبب الطلب…"
              required
            />
          </label>
          {error ? <p className="dash-banner dash-banner--warn">{error}</p> : null}
          <button type="submit" className="auth-btn auth-btn--google" disabled={busy}>
            {busy ? "…" : status === "rejected" ? "إعادة الطلب" : "إرسال طلب الترقية"}
          </button>
          {status === "rejected" && request?.reviewNote ? (
            <p className="dash-banner dash-banner--warn">رفض سابق: {request.reviewNote}</p>
          ) : null}
        </form>
      )}
    </section>
  );
}
