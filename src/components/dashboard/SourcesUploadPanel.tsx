"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import type { SourceUploadRow } from "@/lib/cloud-sync";
import { ArabyaPanel, ArabyaPanelStack } from "@/components/ui/ArabyaPanel";

export function SourcesUploadPanel() {
  const t = useTranslations("Studio");
  const locale = useLocale();
  const [uploads, setUploads] = useState<SourceUploadRow[]>([]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/studio/uploads", { cache: "no-store" });
      const data = (await res.json()) as {
        ok?: boolean;
        uploads?: SourceUploadRow[];
        error?: string;
      };
      if (!res.ok || !data.ok) throw new Error(data.error || t("loadError"));
      setUploads(data.uploads || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setError(null);
    setOkMsg(null);
    try {
      const text = await file.text();
      JSON.parse(text);
      const res = await fetch("/api/studio/uploads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          payload: text,
          notes,
          kind: "json",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; id?: string; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || t("uploadError"));
      setOkMsg(t("uploadOk", { id: data.id ?? "" }));
      setNotes("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <ArabyaPanelStack>
      <ArabyaPanel
        title={t("uploadTitle")}
        muted={
          <>
            {t("uploadLead")}{" "}
            <code>import-irab-book</code> / <code>import-from-incoming</code>
          </>
        }
      >
        <div className="dash-form">
          <label>
            {t("editorNotes")}
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder={t("notesPlaceholder")}
            />
          </label>
          <label
            className="users-action users-action--primary"
            style={{ display: "inline-flex", cursor: "pointer" }}
          >
            {busy ? t("uploadBusy") : t("chooseJson")}
            <input
              type="file"
              accept="application/json,.json"
              hidden
              disabled={busy}
              onChange={(e) => void onFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        {error ? <p className="dash-banner dash-banner--warn">{error}</p> : null}
        {okMsg ? <p className="dash-banner dash-banner--ok">{okMsg}</p> : null}
      </ArabyaPanel>

      <ArabyaPanel title={t("uploadedTitle")}>
        {uploads.length === 0 ? (
          <p className="dash-muted">{t("noUploads")}</p>
        ) : (
          <ul className="dash-list">
            {uploads.map((u) => (
              <li key={u.id}>
                <strong>{u.filename}</strong> — {u.status}
                {u.bytes != null ? ` · ${t("bytes", { bytes: u.bytes })}` : ""} ·{" "}
                {new Date(u.createdAt).toLocaleString(locale)}
                {u.notes ? ` · ${u.notes}` : ""}
              </li>
            ))}
          </ul>
        )}
      </ArabyaPanel>
    </ArabyaPanelStack>
  );
}
