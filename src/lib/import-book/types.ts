export type IrabBookMeta = {
  title: string;
  license?: string;
  source?: string;
};

export type IrabBookWord = {
  wordId: string;
  text: string;
  evidence?: string;
  confidence?: "high" | "medium" | "low";
};

export type IrabBookVerse = {
  verseKey: string;
  text?: string;
  words?: IrabBookWord[];
};

export type IrabBookPayload = {
  meta: IrabBookMeta;
  verses: IrabBookVerse[];
};

export type ImportSourceKind =
  | "json"
  | "csv"
  | "xlsx"
  | "docx"
  | "pdf"
  | "google_sheet";

export type BookImportJobStatus =
  | "processing"
  | "ready"
  | "pending_review"
  | "failed";

export type BookImportJobRow = {
  id: string;
  userId: string;
  title: string;
  slug: string;
  filename: string | null;
  sourceKind: ImportSourceKind;
  status: BookImportJobStatus;
  message: string | null;
  verseCount: number;
  wordCount: number;
  published: boolean;
  createdAt: number;
  updatedAt: number;
};
