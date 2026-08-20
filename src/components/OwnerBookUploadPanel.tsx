"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BookImportJobRow, BookKind } from "@/lib/import-book/types";
import { LIBRARY_CATEGORIES } from "@/lib/library/categories";
import { ArabyaPanel, ArabyaPanelStack } from "@/components/ui/ArabyaPanel";

const ACCEPT_IRAB =
  ".docx,.pdf,.xlsx,.xls,.csv,.json,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,application/json";

const ACCEPT_READING = ".pdf,application/pdf";

type ReadingDelivery = "upload" | "drive";

type Props = {
  syncReady: boolean;
  editorial?: boolean;
};

export function OwnerBookUploadPanel({ syncReady, editorial = false }: Props) {
  const t = useTranslations("BookImport");
  const locale = useLocale();
  const [bookKind, setBookKind] = useState<BookKind>("reading");
  const [readingDelivery, setReadingDelivery] = useState<ReadingDelivery>("upload");
  const [title, setTitle] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [slug, setSlug] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("education");
  const [description, setDescription] = useState("");
  const [publisher, setPublisher] = useState("عربية");
  const [pageCount, setPageCount] = useState("");
  const [sheetUrl, setSheetUrl] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
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

  function resetForm() {
    setTitle("");
    setTitleEn("");
    setSlug("");
    setAuthor("");
    setCategory("education");
    setDescription("");
    setPublisher("عربية");
    setPageCount("");
    setSheetUrl("");
    setDriveUrl("");
    setSelectedFile(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function submit() {
    if (!title.trim()) {
      setError(t("titleRequired"));
      return;
    }

    const isReading = bookKind === "reading";
    const useDrive = isReading && readingDelivery === "drive";

    if (isReading) {
      if (useDrive) {
        if (!driveUrl.trim()) {
          setError(t("driveUrlRequired"));
          return;
        }
      } else if (!selectedFile) {
        setError(t("readingFileRequired"));
        return;
      }
    } else if (!selectedFile && !sheetUrl.trim()) {
      setError(t("fileOrSheetRequired"));
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("title", title.trim());
      form.set("bookKind", bookKind);
      if (slug.trim()) form.set("slug", slug.trim());
      if (titleEn.trim()) form.set("titleEn", titleEn.trim());
      if (author.trim()) form.set("author", author.trim());
      if (category) form.set("category", category);
      if (description.trim()) form.set("description", description.trim());
      if (publisher.trim()) form.set("publisher", publisher.trim());
      if (pageCount.trim()) form.set("pageCount", pageCount.trim());

      if (bookKind === "irab" && sheetUrl.trim()) {
        form.set("googleSheetUrl", sheetUrl.trim());
      }
      if (useDrive) {
        form.set("googleDriveUrl", driveUrl.trim());
      }
      if (selectedFile) form.set("file", selectedFile);

      const res = await fetch("/api/account/import-book", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string; message?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || t("uploadFailed"));
      }
      resetForm();
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
  const useDrive = isReading && readingDelivery === "drive";

  return (
    <ArabyaPanelStack className="dash-stack">
      <ArabyaPanel legacyDash title={t("title")} muted={editorial ? t("editorialLead") : t("lead")}>
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
                  setSelectedFile(null);
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
                onChange={() => {
                  setBookKind("irab");
                  setDriveUrl("");
                  setReadingDelivery("upload");
                }}
              />
              {t("bookKindIrab")}
            </label>
          </fieldset>

          <p className="dash-muted">{isReading ? t("readingLead") : t("irabLead")}</p>

          <div className="owner-upload-meta-grid">
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

            {isReading ? (
              <label>
                {t("titleEn")}
                <input
                  type="text"
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder={t("titleEnPlaceholder")}
                  maxLength={200}
                />
              </label>
            ) : null}

            <label>
              {t("author")}
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder={t("authorPlaceholder")}
                maxLength={120}
              />
            </label>

            {isReading ? (
              <label>
                {t("category")}
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {LIBRARY_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {locale === "en" ? cat.labelEn : cat.labelAr}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {editorial ? (
              <label>
                {t("slug")}
                <input
                  type="text"
                  dir="ltr"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder={t("slugPlaceholder")}
                  maxLength={80}
                />
              </label>
            ) : null}

            {isReading ? (
              <label>
                {t("publisher")}
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  maxLength={80}
                />
              </label>
            ) : null}

            {isReading ? (
              <label>
                {t("pageCount")}
                <input
                  type="number"
                  min={1}
                  value={pageCount}
                  onChange={(e) => setPageCount(e.target.value)}
                  placeholder="66"
                />
              </label>
            ) : null}
          </div>

          {isReading ? (
            <label>
              {t("description")}
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("descriptionPlaceholder")}
                maxLength={1200}
              />
            </label>
          ) : null}

          {isReading ? (
            <fieldset className="owner-upload-kind">
              <legend>{t("readingSourceLabel")}</legend>
              <label>
                <input
                  type="radio"
                  name="readingDelivery"
                  value="upload"
                  checked={readingDelivery === "upload"}
                  onChange={() => {
                    setReadingDelivery("upload");
                    setDriveUrl("");
                  }}
                />
                {t("readingSourceUpload")}
              </label>
              <label>
                <input
                  type="radio"
                  name="readingDelivery"
                  value="drive"
                  checked={readingDelivery === "drive"}
                  onChange={() => {
                    setReadingDelivery("drive");
                    setSelectedFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                />
                {t("readingSourceDrive")}
              </label>
            </fieldset>
          ) : null}

          {useDrive ? (
            <>
              <label>
                {t("googleDrive")}
                <input
                  type="url"
                  dir="ltr"
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/file/d/.../view"
                />
              </label>
              <p className="dash-muted">{t("driveHelp")}</p>
            </>
          ) : (
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
                {selectedFile
                  ? selectedFile.name
                  : isReading
                    ? t("readingFormats")
                    : t("formats")}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept={isReading ? ACCEPT_READING : ACCEPT_IRAB}
                hidden
                disabled={busy}
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </label>
          )}

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

          <button type="button" disabled={busy} onClick={() => void submit()}>
            {busy ? t("busy") : t("submitBook")}
          </button>
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
