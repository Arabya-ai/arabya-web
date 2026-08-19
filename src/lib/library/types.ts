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
  /** Public static path (`/library/foo.pdf`) or API (`/api/library/foo/file`). */
  pdfUrl: string;
  pageCount?: number;
  license?: string;
  importedAt?: string;
};

export type LibraryCatalog = {
  works: LibraryWorkMeta[];
};
