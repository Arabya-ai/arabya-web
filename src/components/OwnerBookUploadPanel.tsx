"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { BookImportJobRow, BookKind } from "@/lib/import-book/types";
import type { LibraryCategoryMeta } from "@/lib/library/categories";
import { LIBRARY_CATEGORIES, libraryCategoryLabel } from "@/lib/library/categories";
import type { LibraryWorkMeta } from "@/lib/library/types";
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
  const [notice, setNotice] = useState<string | null>(null);
  const [jobs, setJobs] = useState<BookImportJobRow[]>([]);
  const [works, setWorks] = useState<LibraryWorkMeta[]>([]);
  const [categories, setCategories] = useState<LibraryCategoryMeta[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
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

  const loadWorks = useCallback(async () => {
    if (!editorial) return;
    try {
      const res = await fetch("/api/account/library-works", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; works?: LibraryWorkMeta[] };
      if (data.ok && data.works) setWorks(data.works);
    } catch {
      /* ignore */
    }
  }, [editorial]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/account/library-categories", { cache: "no-store" });
      const data = (await res.json()) as { ok?: boolean; categories?: LibraryCategoryMeta[] };
      if (data.ok && data.categories) setCategories(data.categories);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!syncReady) return;
    void loadJobs();
    void loadWorks();
    void loadCategories();
  }, [loadJobs, loadWorks, loadCategories, syncReady]);

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
    setEditingSlug(null);
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
    setBookKind("reading");
    if (fileRef.current) fileRef.current.value = "";
  }

  function startEdit(work: LibraryWorkMeta) {
    setEditingSlug(work.id);
    setBookKind("reading");
    setTitle(work.title);
    setTitleEn(work.titleEn || "");
    setSlug(work.id);
    setAuthor(work.author || "");
    setCategory(work.category || "education");
    setDescription(work.description || "");
    setPublisher(work.publisher || "عربية");
    setPageCount(work.pageCount ? String(work.pageCount) : "");
    setDriveUrl(work.externalUrl || "");
    setReadingDelivery(work.externalSource === "google_drive" ? "drive" : "upload");
    setSelectedFile(null);
    setError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function addCategory() {
    const labelAr = newCategory.trim();
    if (labelAr.length < 2) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/account/library-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ labelAr }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        category?: LibraryCategoryMeta;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.category) {
        throw new Error(data.error || t("uploadFailed"));
      }
      setCategories((prev) =>
        prev.some((c) => c.id === data.category!.id) ? prev : [...prev, data.category!],
      );
      setCategory(data.category.id);
      setNewCategory("");
    } catch (e) {
      setError(e instanceof Error ? e.message : t("uploadFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function removeWork(work: LibraryWorkMeta) {
    if (!window.confirm(t("deleteConfirm", { title: work.title }))) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/account/library-works/${work.id}`, { method: "DELETE" });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || t("deleteFailed"));
      if (editingSlug === work.id) resetForm();
      await loadWorks();
      setNotice(t("deleteOk"));
    } catch (e) {
      setError(e instanceof Error ? e.message : t("deleteFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!title.trim()) {
      setError(t("titleRequired"));
      return;
    }

    const isReading = bookKind === "reading";
    const useDrive = isReading && readingDelivery === "drive";

    if (!editingSlug) {
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
    }

    setBusy(true);
    setError(null);
    setNotice(null);
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
      if (bookKind === "irab" && sheetUrl.trim()) form.set("googleSheetUrl", sheetUrl.trim());
      if (useDrive && driveUrl.trim()) form.set("googleDriveUrl", driveUrl.trim());
      if (selectedFile) form.set("file", selectedFile);

      const url = editingSlug
        ? `/api/account/library-works/${editingSlug}`
        : "/api/account/import-book";
      const res = await fetch(url, {
        method: editingSlug ? "PATCH" : "POST",
        body: form,
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || t("uploadFailed"));
      resetForm();
      await Promise.all([loadJobs(), loadWorks()]);
      setNotice(editingSlug ? t("updateOk") : t("createOk"));
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
    return <ArabyaPanel legacyDash title={t("title")} muted={t("syncRequired")} />;
  }

  const isReading = bookKind === "reading";
  const useDrive = isReading && readingDelivery === "drive";
  const cats = categories.length ? categories : LIBRARY_CATEGORIES;

  return (
    <ArabyaPanelStack className="dash-stack library-editor">
      {editorial ? (
        <ArabyaPanel
          legacyDash
          title={t("manageTitle")}
          muted={t("manageLead")}
        >
          {works.length === 0 ? (
            <p className="dash-muted">{t("manageEmpty")}</p>
          ) : (
            <ul className="library-manage-list">
              {works.map((work) => (
                <li key={work.id} className="library-manage-item">
                  <div>
                    <strong>{work.title}</strong>
                    <p>
                      {libraryCategoryLabel(work.category, locale, cats)}
                      {work.pageCount ? ` · ${work.pageCount} ${t("pagesUnit")}` : ""}
                      {work.externalSource === "google_drive" ? ` · ${t("viaDrive")}` : ""}
                    </p>
                  </div>
                  <div className="library-manage-actions">
                    <Link href={`/library/${work.id}`}>{t("viewLibrary")}</Link>
                    <button type="button" onClick={() => startEdit(work)} disabled={busy}>
                      {t("editBook")}
                    </button>
                    <button
                      type="button"
                      className="library-manage-danger"
                      onClick={() => void removeWork(work)}
                      disabled={busy}
                    >
                      {t("deleteBook")}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ArabyaPanel>
      ) : null}

      <ArabyaPanel
        legacyDash
        title={editingSlug ? t("editTitle") : t("title")}
        muted={editorial ? t("editorialLead") : t("lead")}
      >
        <div className="dash-form library-editor-form">
          {editingSlug ? (
            <p className="library-editor-banner">
              {t("editingBanner", { title })}
              <button type="button" onClick={resetForm}>
                {t("cancelEdit")}
              </button>
            </p>
          ) : (
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
          )}

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
              <div className="library-category-field">
                <label>
                  {t("category")}
                  <select value={category} onChange={(e) => setCategory(e.target.value)}>
                    {cats.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {locale === "en" ? cat.labelEn : cat.labelAr}
                      </option>
                    ))}
                  </select>
                </label>
                {editorial ? (
                  <div className="library-category-add">
                    <input
                      type="text"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder={t("newCategoryPlaceholder")}
                      maxLength={40}
                    />
                    <button type="button" disabled={busy || newCategory.trim().length < 2} onClick={() => void addCategory()}>
                      {t("addCategory")}
                    </button>
                  </div>
                ) : null}
              </div>
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
                  disabled={Boolean(editingSlug)}
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
                  placeholder={t("pageCountAuto")}
                />
                <span className="library-field-hint">{t("pageCountHint")}</span>
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
                    if (!editingSlug) setDriveUrl("");
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
            <label className="owner-upload-drop">
              <strong>{editingSlug ? t("replaceFile") : t("dropLabel")}</strong>
              <p className="dash-muted">
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
              <details className="dash-muted">
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
            {busy ? t("busy") : editingSlug ? t("saveChanges") : t("submitBook")}
          </button>
        </div>
        {error ? <p className="dash-banner dash-banner--warn">{error}</p> : null}
        {notice ? <p className="dash-banner dash-banner--ok">{notice}</p> : null}
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
