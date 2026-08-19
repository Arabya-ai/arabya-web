"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BookImportJobRow, BookKind } from "@/lib/import-book/types";
import { ArabyaPanel, ArabyaPanelStack } from "@/components/ui/ArabyaPanel";

const ACCEPT_IRAB =
  ".docx,.pdf,.xlsx,.xls,.csv,.json,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json";

const ACCEPT_READING = ".pdf,application/pdf";

export function OwnerBookUploadPanel({ syncReady }: { syncReady: boolean }) {
  const t = useTranslations("BookImport");
  const locale = useLocale();
  const [bookKind, setBookKind] = useState<BookKind>("reading");
  const [title, setTitle] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<BookImportJobRow[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/account/import-book", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; jobs?: BookImportJobRow[] };
      if (data.ok && data.jobs) setJobs(data.jobs);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!syncReady) return;
    void loadJobs();
  }, [loadJobs, syncReady]);

  useEffect(() => {
    const hasProcessing = jobs.some((j) => j.status === "processing");
    if (hasProcessing && !pollRef.current) {
      pollRef.current = setInterval(() => void loadJobs(), 2500);
    }
    if (!hasProcessing && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [jobs, loadJobs]);

  async function submit(file: File | null) {
    if (!title.trim()) {
      setError(t("titleRequired"));
      return;
    }
    if (bookKind === "reading") {
      if (!file) {
        setError(t("readingFileRequired"));
        return;
      }
    } else if (!file && !sheetUrl.trim()) {
      setError(t("fileOrSheetRequired"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("title", title.trim());
      form.set("bookKind", bookKind);
      if (bookKind === "irab" && sheetUrl.trim()) {
        form.set("googleSheetUrl", sheetUrl.trim());
      }
      if (file) form.set("file", file);
      const res = await fetch("/api/account/import-book", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("uploadFailed"));
      }
      setTitle("");
      setSheetUrl("");
      if (fileRef.current) fileRef.current.value = "";
      await loadJobs();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  function statusLabel(job: BookImportJobRow): string {
    if (job.status === "processing") return t("statusProcessing");
    if (job.status === "ready") return t("statusReady");
    if (job.status === "pending_review") return t("statusPending");
    return t("statusFailed");
  }

  if (!syncReady) {
    return (
      <ArabyaPanel legacyDash title={t("title")} muted={t("syncRequired")} />
    );
  }

  const isReading = bookKind === "reading";

  return (
    <ArabyaPanelStack className="dash-stack">
      <ArabyaPanel legacyDash title={t("title")} muted={t("lead")}>
        <div className="dash-form">
          <fieldset className="owner-upload-kind">
            <legend>{t("bookKindLabel")}</legend>
            <label>
              <input
                type="radio"
                name="bookKind"
                value="reading"
                checked={bookKind === "reading"}
                onChange={() => {
                  setBookKind("reading");
                  setSheetUrl("");
                  if (fileRef.current) fileRef.current.value = "";
                }}
              />
              {t("bookKindReading")}
            </label>
            <label>
              <input
                type="radio"
                name="bookKind"
                value="irab"
                checked={bookKind === "irab"}
                onChange={() => setBookKind("irab")}
              />
              {t("bookKindIrab")}
            </label>
          </fieldset>

          <p className="dash-muted">{isReading ? t("readingLead") : t("irabLead")}</p>

          <label>
            {t("bookTitle")}
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                isReading ? t("readingTitlePlaceholder") : t("bookTitlePlaceholder")
              }
              maxLength={200}
            />
          </label>

          <label
            className="owner-upload-drop"
            style={{
              display: "block",
              padding: "1.25rem",
              border: "2px dashed var(--brand-soft, #ccc)",
              borderRadius: "12px",
              textAlign: "center",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            <strong>{t("dropLabel")}</strong>
            <p className="dash-muted" style={{ margin: "0.5rem 0 0" }}>
              {isReading ? t("readingFormats") : t("formats")}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept={isReading ? ACCEPT_READING : ACCEPT_IRAB}
              hidden
              disabled={busy}
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f) void submit(f);
              }}
            />
          </label>

          {!isReading ? (
            <>
              <label>
                {t("googleSheet")}
                <input
                  type="url"
                  dir="ltr"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
              </label>
              {sheetUrl.trim() ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submit(null)}
                >
                  {busy ? t("busy") : t("importSheet")}
                </button>
              ) : null}

              <details className="dash-muted" style={{ marginTop: "0.75rem" }}>
                <summary>{t("excelHelpTitle")}</summary>
                <p>{t("excelHelp")}</p>
              </details>
            </>
          ) : (
            <p className="dash-muted">
              <Link href="/library">{t("browseLibrary")}</Link>
            </p>
          )}
        </div>
        {error ? <p className="dash-banner dash-banner--warn">{error}</p> : null}
      </ArabyaPanel>

      <ArabyaPanel legacyDash title={t("jobsTitle")}>
        {jobs.length === 0 ? (
          <p className="dash-muted">{t("noJobs")}</p>
        ) : (
          <ul className="dash-list">
            {jobs.map((job) => (
              <li key={job.id}>
                <strong>{job.title}</strong> — {statusLabel(job)}
                {job.message ? ` · ${job.message}` : ""}
                {job.status === "ready" && job.published ? (
                  <>
                    {" · "}
                    {job.bookKind === "reading" ? (
                      <Link href={`/library/${job.slug}`}>{t("viewLibrary")}</Link>
                    ) : (
                      <>
                        <Link href={`/books/${job.slug}`}>{t("viewBook")}</Link>
                        {" · "}
                        <Link href="/mushaf/1">{t("tryMushaf")}</Link>
                      </>
                    )}
                  </>
                ) : null}
                <br />
                <span className="dash-muted" style={{ fontSize: "0.85rem" }}>
                  {new Date(job.updatedAt).toLocaleString(locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </ArabyaPanel>
    </ArabyaPanelStack>
  );
}
