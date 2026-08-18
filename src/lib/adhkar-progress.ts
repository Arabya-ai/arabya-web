import { STORAGE_KEYS } from "@/lib/storage-keys";
import { notifyCloudSyncNeeded } from "@/lib/sync-notify";

type ProgressMap = Record<string, number>;

export type TasbeehState = {
  phraseId: string;
  count: number;
};

export type AdhkarCategorySnapshot = {
  slug: string;
  titleAr: string;
  titleEn: string;
  itemCount: number;
  targetSum: number;
};

const DEFAULT_TASBEEH: TasbeehState = {
  phraseId: "subhanallah",
  count: 0,
};

const LAST_CATEGORY_KEY = "arabya-adhkar-last-category";
export const ADHKAR_UPDATED_EVENT = "arabya-adhkar-updated";

function emitAdhkarUpdated() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(ADHKAR_UPDATED_EVENT));
}

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
  notifyCloudSyncNeeded();
  emitAdhkarUpdated();
}

export function getAdhkarProgressMap(): ProgressMap {
  return readMap();
}

export function applyAdhkarProgressMap(map: ProgressMap) {
  writeMap(map && typeof map === "object" ? map : {});
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

export function resetCategoryCounts(itemIds: string[]) {
  const map = readMap();
  for (const id of itemIds) {
    map[id] = 0;
  }
  writeMap(map);
}

export function setLastAdhkarCategory(slug: string) {
  try {
    localStorage.setItem(LAST_CATEGORY_KEY, slug);
  } catch {
    /* ignore */
  }
}

export function getLastAdhkarCategory(): string | null {
  try {
    const raw = localStorage.getItem(LAST_CATEGORY_KEY);
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

/** Per-category completion using stored counts and slug-prefixed item ids. */
export function computeCategoryProgress(slug: string, targetSum: number) {
  const map = readMap();
  let done = 0;
  const prefix = `${slug}-`;
  for (const [id, count] of Object.entries(map)) {
    if (!id.startsWith(prefix)) continue;
    done += Math.max(0, Number(count) || 0);
  }
  const total = Math.max(1, targetSum);
  const percent = Math.min(100, Math.round((done / total) * 100));
  return { done, total, percent };
}

export function computeItemsProgress(items: Array<{ id: string; repeat: number }>) {
  const map = readMap();
  let done = 0;
  let total = 0;
  for (const item of items) {
    const target = Math.max(1, Number(item.repeat) || 1);
    total += target;
    done += Math.min(target, map[item.id] ?? 0);
  }
  const percent =
    total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return { done, total, percent };
}

export function getAdhkarProgressSummary(categories: AdhkarCategorySnapshot[]) {
  let totalDone = 0;
  let totalTargets = 0;
  for (const cat of categories) {
    const prog = computeCategoryProgress(cat.slug, cat.targetSum);
    totalDone += prog.done;
    totalTargets += prog.total;
  }
  return {
    totalDone,
    totalTargets,
    lastSlug: getLastAdhkarCategory(),
  };
}

export function getTasbeehState(): TasbeehState {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.tasbeeh);
    if (!raw) return { ...DEFAULT_TASBEEH };
    const parsed = JSON.parse(raw) as Partial<TasbeehState>;
    const phraseId =
      typeof parsed.phraseId === "string" && parsed.phraseId
        ? parsed.phraseId
        : DEFAULT_TASBEEH.phraseId;
    const count =
      typeof parsed.count === "number" && parsed.count >= 0
        ? Math.floor(parsed.count)
        : 0;
    return { phraseId, count };
  } catch {
    return { ...DEFAULT_TASBEEH };
  }
}

function writeTasbeeh(state: TasbeehState) {
  localStorage.setItem(STORAGE_KEYS.tasbeeh, JSON.stringify(state));
  notifyCloudSyncNeeded();
  emitAdhkarUpdated();
}

export function applyTasbeehState(state: TasbeehState) {
  writeTasbeeh({
    phraseId: state.phraseId || DEFAULT_TASBEEH.phraseId,
    count: Math.max(0, Math.floor(state.count || 0)),
  });
}

export function setTasbeehPhrase(phraseId: string): TasbeehState {
  const next = { ...getTasbeehState(), phraseId };
  writeTasbeeh(next);
  return next;
}

export function incrementTasbeeh(): TasbeehState {
  const current = getTasbeehState();
  const next = { ...current, count: current.count + 1 };
  writeTasbeeh(next);
  return next;
}

export function resetTasbeeh(): TasbeehState {
  const next = { ...getTasbeehState(), count: 0 };
  writeTasbeeh(next);
  return next;
}
