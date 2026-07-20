/**
 * Cloud bookmarks adapter — inactive until ARABYA_D1_ENABLED=1 and D1 binding.
 * Local bookmarks remain the default via bookmarks.ts.
 */

import type { Bookmark } from "./bookmarks";

export function isCloudBookmarksEnabled(): boolean {
  return process.env.ARABYA_D1_ENABLED === "1";
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
