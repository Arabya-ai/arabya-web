import { STORAGE_KEYS } from "@/lib/storage-keys";

type ProgressMap = Record<string, number>;

function readMap(): ProgressMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.adhkarProgress);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ProgressMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeMap(map: ProgressMap) {
  localStorage.setItem(STORAGE_KEYS.adhkarProgress, JSON.stringify(map));
}

export function getAdhkarCount(itemId: string): number {
  const n = readMap()[itemId];
  return typeof n === "number" && n >= 0 ? n : 0;
}

export function setAdhkarCount(itemId: string, count: number): number {
  const map = readMap();
  const next = Math.max(0, Math.floor(count));
  map[itemId] = next;
  writeMap(map);
  return next;
}

export function incrementAdhkarCount(
  itemId: string,
  target: number,
): number {
  const current = getAdhkarCount(itemId);
  if (current >= target) return current;
  return setAdhkarCount(itemId, current + 1);
}

export function resetAdhkarCount(itemId: string): number {
  return setAdhkarCount(itemId, 0);
}
