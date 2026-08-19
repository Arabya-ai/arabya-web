"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  clearAllStudyEntries,
  readStudyEntries,
} from "@/lib/study-archive";
import { retentionDaysLabel } from "@/lib/history-retention";
import { notifyCloudSyncNeeded } from "@/lib/cloud-sync-client";
import { ArabyaPanel } from "@/components/ui/ArabyaPanel";

type Props = {
  syncReady: boolean;
};

export function AccountHistoryPanel({ syncReady }: Props) {
  const t = useTranslations("AccountHistory");
  const locale = useLocale() as "ar" | "en";
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [studyCount, setStudyCount] = useState(0);

  useEffect(() => {
    setStudyCount(readStudyEntries().length);
    function reload() {
      setStudyCount(readStudyEntries().length);
    }
    window.addEventListener("arabya-study-updated", reload);
    return () => window.removeEventListener("arabya-study-updated", reload);
  }, []);

  async function clearRemote(scope: "study" | "tahfeez" | "all") {
    setBusy(scope);
    setMsg(null);
    setErr(null);
    try {
      const res = await fetch(`/api/account/history?scope=${scope}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "clear_failed");
      }
      if (scope === "study" || scope === "all") {
        clearAllStudyEntries();
        window.dispatchEvent(new Event("arabya-study-updated"));
      }
      setMsg(t("cleared", { scope: t(`scope_${scope}`) }));
    } catch (e) {
      setErr(e instanceof Error ? e.message : t("error"));
    } finally {
      setBusy(null);
    }
  }

  function clearStudyLocal() {
    clearAllStudyEntries();
    window.dispatchEvent(new Event("arabya-study-updated"));
    notifyCloudSyncNeeded();
    setMsg(t("clearedLocalStudy"));
  }

  const studyCountDisplay = studyCount;

  return (
    <ArabyaPanel legacyDash title={t("title")} muted={t("retention", { days: retentionDaysLabel(locale) })}>
      <p className="dash-muted">{t("lead")}</p>
      <ul className="dash-list" style={{ marginTop: "0.75rem" }}>
        <li>{t("studyCount", { count: studyCountDisplay })}</li>
      </ul>
      <div className="dash-row-actions" style={{ marginTop: "1rem", flexWrap: "wrap" }}>
        <button
          type="button"
          className="danger"
          disabled={!!busy}
          onClick={() => {
            if (syncReady) void clearRemote("study");
            else clearStudyLocal();
          }}
        >
          {busy === "study" ? t("busy") : t("clearStudy")}
        </button>
        {syncReady ? (
          <>
            <button
              type="button"
              className="danger"
              disabled={!!busy}
              onClick={() => void clearRemote("tahfeez")}
            >
              {busy === "tahfeez" ? t("busy") : t("clearTahfeez")}
            </button>
            <button
              type="button"
              className="danger"
              disabled={!!busy}
              onClick={() => void clearRemote("all")}
            >
              {busy === "all" ? t("busy") : t("clearAll")}
            </button>
          </>
        ) : null}
      </div>
      {msg ? <p className="dash-banner dash-banner--ok">{msg}</p> : null}
      {err ? <p className="dash-banner dash-banner--warn">{err}</p> : null}
    </ArabyaPanel>
  );
}
