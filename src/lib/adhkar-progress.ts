import { STORAGE_KEYS } from "@/lib/storage-keys";

type ProgressMap = Record<string, number>;

export type TasbeehState = {
  phraseId: string;
  count: number;
};

const DEFAULT_TASBEEH: TasbeehState = {
  phraseId: "subhanallah",
  count: 0,
};

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
