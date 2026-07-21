/** Per-ayah study notes stored in localStorage. */

export type AyahNote = {
  key: string;
  surahId: number;
  verse: number;
  text: string;
  updatedAt: number;
};

const KEY = "arabya-ayah-notes";
const MAX = 300;

export function readAyahNotes(): AyahNote[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AyahNote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list: AyahNote[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
}

export function getAyahNote(key: string): AyahNote | null {
  return readAyahNotes().find((n) => n.key === key) ?? null;
}

export function saveAyahNote(
  entry: Omit<AyahNote, "updatedAt" | "text"> & { text: string },
): AyahNote[] {
  const list = readAyahNotes().filter((n) => n.key !== entry.key);
  const trimmed = entry.text.trim();
  if (!trimmed) {
    writeAll(list);
    return list;
  }
  const next: AyahNote = {
    ...entry,
    text: trimmed.slice(0, 4000),
    updatedAt: Date.now(),
  };
  writeAll([next, ...list]);
  return [next, ...list];
}
