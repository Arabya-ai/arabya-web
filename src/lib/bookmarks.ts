export type Bookmark = {
  surahId: number;
  verse: number;
  page: number;
  key: string;
  savedAt: number;
};

const BOOKMARKS_KEY = "arabya-bookmarks";

function notify() {
  void import("@/lib/cloud-sync-client")
    .then((m) => m.notifyCloudSyncNeeded())
    .catch(() => undefined);
}

export function readBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Bookmark[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeBookmarks(list: Bookmark[]) {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(list.slice(0, 200)));
  notify();
}

export function toggleBookmark(entry: Omit<Bookmark, "savedAt">): Bookmark[] {
  const list = readBookmarks();
  const idx = list.findIndex((b) => b.key === entry.key);
  let next: Bookmark[];
  if (idx >= 0) next = list.filter((_, i) => i !== idx);
  else next = [{ ...entry, savedAt: Date.now() }, ...list];
  writeBookmarks(next);
  return next;
}

export function isBookmarked(key: string): boolean {
  return readBookmarks().some((b) => b.key === key);
}
