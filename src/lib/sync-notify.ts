"use client";

import { STORAGE_KEYS } from "@/lib/storage-keys";

export const CLOUD_SYNC_EVENT = "arabya-cloud-sync-needed";
export const DATA_REV_KEY = STORAGE_KEYS.dataRev;

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
