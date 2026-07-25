"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  collectLocalSyncPayload,
  pullMergeAndPush,
  pushLocalOnly,
} from "@/lib/cloud-sync-client";

export function CloudSyncPanel() {
  const t = useTranslations("Sync");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const local = collectLocalSyncPayload();
    setStatus(
      t("statusLocal", {
        bookmarks: local.bookmarks.length,
        notes: local.notes.length,
      }),
    );
  }, [t]);

  function messageFor(
    result: Awaited<ReturnType<typeof pullMergeAndPush>> | Awaited<ReturnType<typeof pushLocalOnly>>,
  ): string {
    switch (result.code) {
      case "not_signed_in":
        return t("statusNotSignedIn");
      case "not_configured":
        return t("statusNotConfigured");
      case "pull_failed":
        return t("statusPullFailed");
      case "push_failed":
        return t("statusPushFailed");
      case "synced":
        return t("statusSynced", {
          bookmarks: "bookmarks" in result ? (result.bookmarks ?? 0) : 0,
          notes: "notes" in result ? (result.notes ?? 0) : 0,
          study: "study" in result ? (result.study ?? 0) : 0,
        });
      case "saved":
        return t("statusSaved");
      default:
        return t("statusError");
    }
  }

  async function run(mode: "full" | "push") {
    setBusy(true);
    setStatus(mode === "full" ? t("statusFullSync") : t("statusPush"));
    try {
      const result =
        mode === "full" ? await pullMergeAndPush() : await pushLocalOnly();
      setStatus(messageFor(result));
    } catch {
      setStatus(t("statusError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-panel account-panel--accent" aria-label={t("ariaLabel")}>
      <h2>{t("title")}</h2>
      <p>{t("lead")}</p>
      <div className="account-panel-actions">
        <button
          type="button"
          className="auth-btn auth-btn--google"
          disabled={busy}
          onClick={() => void run("push")}
        >
          {t("syncNow")}
        </button>
        <button
          type="button"
          className="auth-btn auth-btn--account"
          disabled={busy}
          onClick={() => void run("full")}
        >
          {t("syncFull")}
        </button>
      </div>
      {status ? <p className="account-sync-status">{status}</p> : null}
    </section>
  );
}
