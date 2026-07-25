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

  async function run(mode: "full" | "push") {
    setBusy(true);
    setStatus(mode === "full" ? t("statusFullSync") : t("statusPush"));
    try {
      const result =
        mode === "full" ? await pullMergeAndPush() : await pushLocalOnly();
      setStatus(result.message);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : t("statusError"));
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
