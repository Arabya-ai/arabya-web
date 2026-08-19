"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
  deleteStudyEntry,
  readStudyEntries,
  updateStudyNotes,
  clearAllStudyEntries,
  type StudyEntry,
} from "@/lib/study-archive";
import { retentionDaysLabel } from "@/lib/history-retention";
import { notifyCloudSyncNeeded } from "@/lib/cloud-sync-client";
import { ArabyaPanel, ArabyaPanelStack } from "@/components/ui/ArabyaPanel";
import { toArabicNumerals } from "@/lib/format";

function formatCount(value: number, locale: string): string {
  return locale === "ar" ? toArabicNumerals(value) : String(value);
}

export function StudyArchivePanel({ syncReady = false }: { syncReady?: boolean }) {
  const t = useTranslations("StudyArchive");
  const locale = useLocale() as "ar" | "en";
  const [entries, setEntries] = useState<StudyEntry[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  function reload() {
    setEntries(readStudyEntries());
  }

  useEffect(() => {
    reload();
    window.addEventListener("arabya-study-updated", reload);
    window.addEventListener("focus", reload);
    return () => {
      window.removeEventListener("arabya-study-updated", reload);
      window.removeEventListener("focus", reload);
    };
  }, []);

  function kindLabel(kind: StudyEntry["kind"]) {
    if (kind === "quick") return t("kindQuick");
    if (kind === "word") return t("kindWord");
    return t("kindAyah");
  }

  return (
    <ArabyaPanelStack className="dash-stack">
      <ArabyaPanel legacyDash
        title={
          <>
            {t("title")}{" "}
            <span className="library-count">({formatCount(entries.length, locale)})</span>
          </>
        }
        muted={
          <>
            {t("lead")}{" "}
            <span className="dash-muted">
              ({t("retention", { days: retentionDaysLabel(locale) })})
            </span>
          </>
        }
      />

      {entries.length > 0 ? (
        <div className="dash-row-actions">
          <button
            type="button"
            className="danger"
            onClick={() => {
              const ok = window.confirm(t("confirmClearAll"));
              if (!ok) return;
              clearAllStudyEntries();
              notifyCloudSyncNeeded();
              reload();
            }}
          >
            {t("clearAll")}
          </button>
          {syncReady ? (
            <button
              type="button"
              className="danger"
              onClick={async () => {
                const ok = window.confirm(t("confirmClearAll"));
                if (!ok) return;
                try {
                  await fetch("/api/account/history?scope=study", { method: "DELETE" });
                  clearAllStudyEntries();
                  reload();
                } catch {
                  window.alert(t("clearError"));
                }
              }}
            >
              {t("clearAllCloud")}
            </button>
          ) : null}
        </div>
      ) : null}

      {entries.length === 0 ? (
        <ArabyaPanel legacyDash muted={<>{t("empty")} <Link href="/study">{t("quickStudyLink")}</Link>.</>} />
      ) : (
        entries.map((e) => (
          <ArabyaPanel key={e.id} as="article" legacyDash className="study-archive-card">
            <div className="study-archive-head">
              <div>
                <p className="dash-kicker">{kindLabel(e.kind)}</p>
                <h2>{e.title}</h2>
                {e.snippet ? <p className="dash-muted">{e.snippet}</p> : null}
              </div>
              <div className="dash-row-actions">
                {e.href ? (
                  <Link href={e.href} className="account-panel-link">
                    {t("open")}
                  </Link>
                ) : null}
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    deleteStudyEntry(e.id);
                    reload();
                  }}
                >
                  {t("delete")}
                </button>
              </div>
            </div>
            {editing === e.id ? (
              <div className="dash-form">
                <label>
                  {t("notesLabel")}
                  <textarea
                    rows={3}
                    value={draft}
                    onChange={(ev) => setDraft(ev.target.value)}
                  />
                </label>
                <div className="dash-row-actions">
                  <button
                    type="button"
                    onClick={() => {
                      updateStudyNotes(e.id, draft);
                      setEditing(null);
                      reload();
                    }}
                  >
                    {t("save")}
                  </button>
                  <button type="button" onClick={() => setEditing(null)}>
                    {t("cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                {e.notes ? <p>{e.notes}</p> : <p className="dash-muted">{t("noNotes")}</p>}
                <button
                  type="button"
                  onClick={() => {
                    setEditing(e.id);
                    setDraft(e.notes || "");
                  }}
                >
                  {t("editNotes")}
                </button>
              </div>
            )}
            <p className="dash-muted" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
              {t("updatedAt", {
                date: new Date(e.updatedAt).toLocaleString(locale),
              })}
            </p>
          </ArabyaPanel>
        ))
      )}
    </ArabyaPanelStack>
  );
}
