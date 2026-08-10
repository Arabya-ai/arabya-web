import { STORAGE_KEYS } from "@/lib/storage-keys";

const KEY = STORAGE_KEYS.favoriteReciters;

export function readFavoriteReciters(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === "string").slice(0, 80);
  } catch {
    return [];
  }
}

export function writeFavoriteReciters(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids.slice(0, 80)));
}

export function isFavoriteReciter(id: string): boolean {
  return readFavoriteReciters().includes(id);
}

export function toggleFavoriteReciter(id: string): string[] {
  const list = readFavoriteReciters();
  const next = list.includes(id)
    ? list.filter((x) => x !== id)
    : [id, ...list];
  writeFavoriteReciters(next);
  return next;
}
