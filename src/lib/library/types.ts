export type LibraryWorkStatus = "ready" | "pending_review" | "awaiting";

export type LibraryWorkMeta = {
  id: string;
  title: string;
  titleEn?: string;
  author?: string;
  category?: string;
  description?: string;
  descriptionEn?: string;
  status: LibraryWorkStatus;
  /** Local static/API path or external preview URL (e.g. Google Drive). */
  pdfUrl: string;
  /** When set, PDF is hosted externally (Google Drive) — not on server disk. */
  externalSource?: "google_drive";
  /** Original share link (Google Drive) for admin reference. */
  externalUrl?: string;
  pageCount?: number;
  fileSizeKb?: number;
  publisher?: string;
  edition?: string;
  coverUrl?: string;
  publishedAt?: string;
  license?: string;
  importedAt?: string;
};

export type LibraryCatalog = {
  works: LibraryWorkMeta[];
};
