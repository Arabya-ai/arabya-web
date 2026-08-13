/**
 * Cloud bookmarks adapter — inactive until user sync is enabled.
 * Local bookmarks remain the default via bookmarks.ts.
 */

import type { Bookmark } from "./bookmarks";
import { isCloudSyncConfigured } from "./cloud-sync";

export function isCloudBookmarksEnabled(): boolean {
  return isCloudSyncConfigured();
}

/** Placeholder for future D1 sync. Returns null while disabled. */
export async function fetchCloudBookmarks(
  userId: string,
): Promise<Bookmark[] | null> {
  if (!isCloudBookmarksEnabled() || !userId) return null;
  // Wire to Cloudflare D1 when accounts launch.
  return null;
}

export async function upsertCloudBookmark(
  userId: string,
  entry: Bookmark,
): Promise<boolean> {
  if (!isCloudBookmarksEnabled() || !userId || !entry?.key) return false;
  return false;
}
