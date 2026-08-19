"use client";

import type { Bookmark } from "@/lib/bookmarks";
import { readBookmarks, writeBookmarks } from "@/lib/bookmarks";
import type { AyahNote } from "@/lib/ayah-notes";
import { readAyahNotes } from "@/lib/ayah-notes";
import {
  LAST_MUSHAF_PAGE_KEY,
  readReadingHabit,
  writeReadingHabit,
  type ReadingHabitState,
} from "@/lib/reading-habit";
import {
  purgeStudyEntries,
} from "@/lib/history-retention";
import {
  readStudyEntries,
  writeStudyEntries,
  type StudyEntry,
} from "@/lib/study-archive";

import { STORAGE_KEYS } from "@/lib/storage-keys";
import {
  applyAdhkarProgressMap,
  applyTasbeehState,
  getAdhkarProgressMap,
  getTasbeehState,
} from "@/lib/adhkar-progress";
import { sanitizeAdhkarMap, sanitizeTasbeehState } from "@/lib/adhkar-sync";
import {
  CLOUD_SYNC_EVENT,
  DATA_REV_KEY,
  notifyCloudSyncNeeded,
  withCloudSyncSuppressed,
} from "@/lib/sync-notify";

export { CLOUD_SYNC_EVENT, DATA_REV_KEY, notifyCloudSyncNeeded, withCloudSyncSuppressed };

const NOTES_KEY = STORAGE_KEYS.ayahNotes;

function writeAllNotes(list: AyahNote[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(list.slice(0, 300)));
}

export function collectLocalSyncPayload() {
  const lastRaw = localStorage.getItem(LAST_MUSHAF_PAGE_KEY);
  const lastPage = lastRaw ? Number(lastRaw) : null;
  return {
    bookmarks: readBookmarks(),
    notes: readAyahNotes(),
    study: readStudyEntries(),
    progress: {
      lastPage: Number.isFinite(lastPage) ? lastPage : null,
      habit: readReadingHabit(),
      adhkar: getAdhkarProgressMap(),
      tasbeeh: getTasbeehState(),
    },
  };
}

export function applyCloudToLocal(data: {
  bookmarks: Bookmark[];
  notes: AyahNote[];
  study?: StudyEntry[];
  progress: {
    lastPage: number | null;
    habit: unknown;
    adhkar?: Record<string, number>;
    tasbeeh?: { phraseId: string; count: number };
    updatedAt?: number | null;
  };
}) {
  withCloudSyncSuppressed(() => {
    if (Array.isArray(data.bookmarks)) writeBookmarks(data.bookmarks);
    if (Array.isArray(data.notes)) writeAllNotes(data.notes);
    if (Array.isArray(data.study)) writeStudyEntries(purgeStudyEntries(data.study));

    const habit = data.progress?.habit;
    if (habit && typeof habit === "object") {
      writeReadingHabit(habit as ReadingHabitState);
    }
    if (data.progress?.lastPage != null) {
      localStorage.setItem(LAST_MUSHAF_PAGE_KEY, String(data.progress.lastPage));
    }
    if (data.progress?.adhkar && typeof data.progress.adhkar === "object") {
      applyAdhkarProgressMap(data.progress.adhkar);
    }
    if (data.progress?.tasbeeh && typeof data.progress.tasbeeh === "object") {
      applyTasbeehState(data.progress.tasbeeh);
    }
  });
}

function mergeBookmarks(local: Bookmark[], cloud: Bookmark[]): Bookmark[] {
  const map = new Map<string, Bookmark>();
  for (const item of [...cloud, ...local]) {
    if (!item?.key) continue;
    const prev = map.get(item.key);
    if (!prev || (item.savedAt || 0) >= (prev.savedAt || 0)) {
      map.set(item.key, item);
    }
  }
  return [...map.values()]
    .sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0))
    .slice(0, 200);
}

function mergeNotes(local: AyahNote[], cloud: AyahNote[]): AyahNote[] {
  const map = new Map<string, AyahNote>();
  for (const item of [...cloud, ...local]) {
    if (!item?.key) continue;
    const prev = map.get(item.key);
    if (!prev || (item.updatedAt || 0) >= (prev.updatedAt || 0)) {
      map.set(item.key, item);
    }
  }
  return [...map.values()]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 300);
}

function mergeStudy(local: StudyEntry[], cloud: StudyEntry[]): StudyEntry[] {
  const map = new Map<string, StudyEntry>();
  for (const item of [...cloud, ...local]) {
    if (!item?.id) continue;
    const prev = map.get(item.id);
    if (!prev || (item.updatedAt || 0) >= (prev.updatedAt || 0)) {
      map.set(item.id, item);
    }
  }
  return [...map.values()]
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 200);
}

function mergeAdhkar(
  local: Record<string, number>,
  cloud: Record<string, number>,
): Record<string, number> {
  const out: Record<string, number> = { ...sanitizeAdhkarMap(cloud) };
  for (const [key, value] of Object.entries(sanitizeAdhkarMap(local))) {
    const prev = out[key] ?? 0;
    out[key] = Math.max(prev, Number(value) || 0);
  }
  return out;
}

function mergeTasbeeh(
  local: { phraseId: string; count: number },
  cloud: { phraseId: string; count: number },
  preferCloud: boolean,
) {
  const localSafe = sanitizeTasbeehState(local);
  const cloudSafe = sanitizeTasbeehState(cloud);
  if (preferCloud) {
    return {
      phraseId: cloudSafe.phraseId || localSafe.phraseId,
      count: Math.max(localSafe.count, cloudSafe.count),
    };
  }
  return {
    phraseId: localSafe.phraseId || cloudSafe.phraseId,
    count: Math.max(localSafe.count, cloudSafe.count),
  };
}

export function mergeCloudAndLocal(cloud: {
  bookmarks: Bookmark[];
  notes: AyahNote[];
  study?: StudyEntry[];
  progress: {
    lastPage: number | null;
    habit: unknown;
    adhkar?: Record<string, number>;
    tasbeeh?: { phraseId: string; count: number };
    updatedAt?: number | null;
  };
}) {
  const local = collectLocalSyncPayload();
  const localRev = Number(localStorage.getItem(DATA_REV_KEY) || 0);
  const cloudRev = Number(cloud.progress?.updatedAt || 0);
  const preferCloudProgress = cloudRev >= localRev;

  const progress = preferCloudProgress
    ? {
        lastPage: cloud.progress?.lastPage ?? local.progress.lastPage,
        habit:
          cloud.progress?.habit && typeof cloud.progress.habit === "object"
            ? cloud.progress.habit
            : local.progress.habit,
        adhkar: mergeAdhkar(
          local.progress.adhkar || {},
          cloud.progress?.adhkar || {},
        ),
        tasbeeh: mergeTasbeeh(
          local.progress.tasbeeh || { phraseId: "subhanallah", count: 0 },
          cloud.progress?.tasbeeh || { phraseId: "subhanallah", count: 0 },
          true,
        ),
      }
    : {
        lastPage: local.progress.lastPage ?? cloud.progress?.lastPage ?? null,
        habit: local.progress.habit,
        adhkar: mergeAdhkar(
          local.progress.adhkar || {},
          cloud.progress?.adhkar || {},
        ),
        tasbeeh: mergeTasbeeh(
          local.progress.tasbeeh || { phraseId: "subhanallah", count: 0 },
          cloud.progress?.tasbeeh || { phraseId: "subhanallah", count: 0 },
          false,
        ),
      };

  return {
    bookmarks: mergeBookmarks(local.bookmarks, cloud.bookmarks || []),
    notes: mergeNotes(local.notes, cloud.notes || []),
    study: mergeStudy(local.study, cloud.study || []),
    progress,
  };
}

export async function pullMergeAndPush(): Promise<{
  ok: boolean;
  code:
    | "not_signed_in"
    | "not_configured"
    | "pull_failed"
    | "push_failed"
    | "synced";
  bookmarks?: number;
  notes?: number;
  study?: number;
}> {
  const pullRes = await fetch("/api/sync", { method: "GET", cache: "no-store" });
  const pullData = await pullRes.json();
  if (pullRes.status === 401) {
    return { ok: false, code: "not_signed_in" };
  }
  if (pullRes.status === 503) {
    return { ok: false, code: "not_configured" };
  }
  if (!pullRes.ok || !pullData.ok) {
    return { ok: false, code: "pull_failed" };
  }

  const merged = mergeCloudAndLocal(pullData);
  applyCloudToLocal({
    bookmarks: merged.bookmarks,
    notes: merged.notes,
    study: merged.study,
    progress: {
      ...merged.progress,
      updatedAt: pullData.progress?.updatedAt ?? null,
    },
  });

  const pushRes = await fetch("/api/sync", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(merged),
  });
  const pushData = await pushRes.json();
  if (!pushRes.ok || !pushData.ok) {
    return { ok: false, code: "push_failed" };
  }

  applyCloudToLocal(pushData);
  return {
    ok: true,
    code: "synced",
    bookmarks: pushData.bookmarks?.length ?? 0,
    notes: pushData.notes?.length ?? 0,
    study: pushData.study?.length ?? 0,
  };
}

export async function pushLocalOnly(): Promise<{
  ok: boolean;
  code:
    | "not_signed_in"
    | "not_configured"
    | "push_failed"
    | "saved";
}> {
  const payload = collectLocalSyncPayload();
  const res = await fetch("/api/sync", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (res.status === 401) return { ok: false, code: "not_signed_in" };
  if (res.status === 503) return { ok: false, code: "not_configured" };
  if (!res.ok || !data.ok) {
    return { ok: false, code: "push_failed" };
  }
  applyCloudToLocal(data);
  return { ok: true, code: "saved" };
}
