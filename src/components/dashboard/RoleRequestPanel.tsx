"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { ArabyaPanel } from "@/components/ui/ArabyaPanel";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  /** Members may request editor (Plus). Admin rank is never self-requestable. */
  const canRequest = role === "member";

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
        body: JSON.stringify({ message, targetRole: "editor" }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; id?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("submitError"));
      }
      setRequest({
        id: data.id || "",
        status: "pending",
        message,
        targetRole: "editor",
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
      <ArabyaPanel legacyDash id="role-request" title={t("title")} muted={t("loading")} />
    );
  }

  const status = request?.status;

  return (
    <ArabyaPanel legacyDash id="role-request" title={t("title")} muted={t("lead")}>

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
          <p className="dash-muted">{t("requestEditor")}</p>
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
    </ArabyaPanel>
  );
}
