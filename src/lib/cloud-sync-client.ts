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

export const CLOUD_SYNC_EVENT = "arabya-cloud-sync-needed";
export const DATA_REV_KEY = "arabya-data-rev";
const NOTES_KEY = "arabya-ayah-notes";

let suppressNotify = 0;

export function withCloudSyncSuppressed(fn: () => void) {
  suppressNotify += 1;
  try {
    fn();
  } finally {
    suppressNotify -= 1;
  }
}

export function notifyCloudSyncNeeded() {
  if (typeof window === "undefined" || suppressNotify > 0) return;
  try {
    localStorage.setItem(DATA_REV_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(CLOUD_SYNC_EVENT));
}

function writeAllNotes(list: AyahNote[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(list.slice(0, 300)));
}

export function collectLocalSyncPayload() {
  const lastRaw = localStorage.getItem(LAST_MUSHAF_PAGE_KEY);
  const lastPage = lastRaw ? Number(lastRaw) : null;
  return {
    bookmarks: readBookmarks(),
    notes: readAyahNotes(),
    progress: {
      lastPage: Number.isFinite(lastPage) ? lastPage : null,
      habit: readReadingHabit(),
    },
  };
}

export function applyCloudToLocal(data: {
  bookmarks: Bookmark[];
  notes: AyahNote[];
  progress: { lastPage: number | null; habit: unknown; updatedAt?: number | null };
}) {
  withCloudSyncSuppressed(() => {
    if (Array.isArray(data.bookmarks)) writeBookmarks(data.bookmarks);
    if (Array.isArray(data.notes)) writeAllNotes(data.notes);

    const habit = data.progress?.habit;
    if (habit && typeof habit === "object") {
      writeReadingHabit(habit as ReadingHabitState);
    }
    if (data.progress?.lastPage != null) {
      localStorage.setItem(LAST_MUSHAF_PAGE_KEY, String(data.progress.lastPage));
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

export function mergeCloudAndLocal(cloud: {
  bookmarks: Bookmark[];
  notes: AyahNote[];
  progress: { lastPage: number | null; habit: unknown; updatedAt?: number | null };
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
      }
    : {
        lastPage: local.progress.lastPage ?? cloud.progress?.lastPage ?? null,
        habit: local.progress.habit,
      };

  return {
    bookmarks: mergeBookmarks(local.bookmarks, cloud.bookmarks || []),
    notes: mergeNotes(local.notes, cloud.notes || []),
    progress,
  };
}

export async function pullMergeAndPush(): Promise<{
  ok: boolean;
  message: string;
}> {
  const pullRes = await fetch("/api/sync", { method: "GET", cache: "no-store" });
  const pullData = await pullRes.json();
  if (pullRes.status === 401) {
    return { ok: false, message: "not_signed_in" };
  }
  if (pullRes.status === 503) {
    return { ok: false, message: "not_configured" };
  }
  if (!pullRes.ok || !pullData.ok) {
    throw new Error(pullData.message || pullData.error || "فشل السحب");
  }

  const merged = mergeCloudAndLocal(pullData);
  applyCloudToLocal({
    bookmarks: merged.bookmarks,
    notes: merged.notes,
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
    throw new Error(pushData.message || pushData.error || "فشل الرفع");
  }

  applyCloudToLocal(pushData);
  return {
    ok: true,
    message: `تمت المزامنة تلقائيًا (${pushData.bookmarks?.length ?? 0} مفضّلة، ${pushData.notes?.length ?? 0} ملاحظة).`,
  };
}

export async function pushLocalOnly(): Promise<{ ok: boolean; message: string }> {
  const payload = collectLocalSyncPayload();
  const res = await fetch("/api/sync", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (res.status === 401) return { ok: false, message: "not_signed_in" };
  if (res.status === 503) return { ok: false, message: "not_configured" };
  if (!res.ok || !data.ok) {
    throw new Error(data.message || data.error || "فشل الرفع");
  }
  applyCloudToLocal(data);
  return { ok: true, message: "تم حفظ التغييرات على السحابة." };
}
