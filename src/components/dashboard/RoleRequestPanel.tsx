"use client";

import { useTranslations } from "next-intl";
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
  const t = useTranslations("Upgrade");
  const tRoles = useTranslations("Roles");
  const [request, setRequest] = useState<RequestState>(null);
  const [message, setMessage] = useState("");
  const [targetRole, setTargetRole] = useState<"editor" | "admin">(
    role === "editor" ? "admin" : "editor",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const canRequestEditor = role === "member";
  const canRequestAdmin = role === "editor" || role === "creator";
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
        throw new Error(data.error || t("submitError"));
      }
      setRequest({
        id: data.id || "",
        status: "pending",
        message,
        targetRole: roleToSend,
      });
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) {
    return (
      <section id="role-request" className="dash-card">
        <h2>{t("title")}</h2>
        <p className="dash-muted">{t("loading")}</p>
      </section>
    );
  }

  const status = request?.status;

  return (
    <section id="role-request" className="dash-card">
      <h2>{t("title")}</h2>
      <p className="dash-muted">{t("lead")}</p>

      {!canRequest ? (
        <p className="dash-banner dash-banner--ok">{t("noRequestNeeded")}</p>
      ) : status === "pending" ? (
        <p className="dash-banner">
          {t("pending")}
          {request?.targetRole
            ? t("pendingTarget", {
                role: tRoles(request.targetRole as "admin" | "editor" | "user"),
              })
            : ""}
          .
        </p>
      ) : status === "approved" ? (
        <p className="dash-banner dash-banner--ok">{t("approved")}</p>
      ) : (
        <form className="dash-form" onSubmit={submit}>
          {canRequestAdmin ? (
            <label>
              {t("upgradeType")}
              <select
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value as "editor" | "admin")}
              >
                <option value="admin">{t("toAdmin")}</option>
              </select>
            </label>
          ) : (
            <p className="dash-muted">{t("requestEditor")}</p>
          )}
          <label>
            {t("messageLabel")}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder={t("messagePlaceholder")}
              required
            />
          </label>
          {error ? <p className="dash-banner dash-banner--warn">{error}</p> : null}
          <button type="submit" className="auth-btn auth-btn--google" disabled={busy}>
            {busy ? "…" : status === "rejected" ? t("resubmit") : t("submit")}
          </button>
          {status === "rejected" && request?.reviewNote ? (
            <p className="dash-banner dash-banner--warn">
              {t("rejectedNote", { note: request.reviewNote })}
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
