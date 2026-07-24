/** حفظ جلسات الدراسة في الحساب (localStorage + مزامنة D1). */

export type StudyEntry = {
  id: string;
  kind: "word" | "quick" | "ayah";
  title: string;
  query?: string;
  surahId?: number;
  verse?: number;
  wordIndex?: number;
  snippet?: string;
  notes: string;
  href?: string;
  createdAt: number;
  updatedAt: number;
};

const KEY = "arabya-study-archive-v1";
const MAX = 200;

function newId(): string {
  return `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function readStudyEntries(): StudyEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as StudyEntry[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function writeStudyEntries(list: StudyEntry[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  window.dispatchEvent(new Event("arabya-study-updated"));
  try {
    localStorage.setItem("arabya-data-rev", String(Date.now()));
    window.dispatchEvent(new Event("arabya-cloud-sync-needed"));
  } catch {
    /* ignore */
  }
}

export function upsertStudyEntry(
  partial: Omit<StudyEntry, "id" | "createdAt" | "updatedAt" | "notes"> & {
    id?: string;
    notes?: string;
  },
): StudyEntry {
  const now = Date.now();
  const list = readStudyEntries();
  if (partial.id) {
    const idx = list.findIndex((e) => e.id === partial.id);
    if (idx >= 0) {
      const next = {
        ...list[idx],
        ...partial,
        notes: partial.notes ?? list[idx].notes,
        updatedAt: now,
      };
      list[idx] = next;
      writeStudyEntries(list);
      return next;
    }
  }

  const dedupeIdx = list.findIndex((e) => {
    if (partial.kind === "word") {
      return (
        e.kind === "word" &&
        e.surahId === partial.surahId &&
        e.verse === partial.verse &&
        e.wordIndex === partial.wordIndex
      );
    }
    if (partial.kind === "quick" && partial.query) {
      return e.kind === "quick" && e.query === partial.query;
    }
    return false;
  });
  if (dedupeIdx >= 0) {
    const next = {
      ...list[dedupeIdx],
      ...partial,
      notes: partial.notes ?? list[dedupeIdx].notes,
      updatedAt: now,
    };
    list.splice(dedupeIdx, 1);
    writeStudyEntries([next, ...list]);
    return next;
  }

  const entry: StudyEntry = {
    id: newId(),
    kind: partial.kind,
    title: partial.title,
    query: partial.query,
    surahId: partial.surahId,
    verse: partial.verse,
    wordIndex: partial.wordIndex,
    snippet: partial.snippet,
    notes: partial.notes || "",
    href: partial.href,
    createdAt: now,
    updatedAt: now,
  };
  writeStudyEntries([entry, ...list]);
  return entry;
}

export function updateStudyNotes(id: string, notes: string) {
  const list = readStudyEntries();
  const idx = list.findIndex((e) => e.id === id);
  if (idx < 0) return;
  list[idx] = { ...list[idx], notes, updatedAt: Date.now() };
  writeStudyEntries(list);
}

export function deleteStudyEntry(id: string) {
  writeStudyEntries(readStudyEntries().filter((e) => e.id !== id));
}
