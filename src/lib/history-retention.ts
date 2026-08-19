/** Account saved history — 30-day retention (study archive, tahfeez sessions). */

import type { StudyEntry } from "@/lib/study-archive";
import type { TahfeezSessionSummary } from "@/lib/tahfeez/types";

/** One calendar month ≈ 30 days. */
export const ACCOUNT_HISTORY_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export function historyRetentionCutoff(now = Date.now()): number {
  return now - ACCOUNT_HISTORY_RETENTION_MS;
}

export function isWithinHistoryRetention(
  timestampMs: number,
  now = Date.now(),
): boolean {
  if (!Number.isFinite(timestampMs) || timestampMs <= 0) return false;
  return timestampMs >= historyRetentionCutoff(now);
}

export function purgeStudyEntries(
  entries: StudyEntry[],
  now = Date.now(),
): StudyEntry[] {
  const cutoff = historyRetentionCutoff(now);
  return entries.filter((e) => (e.updatedAt || e.createdAt || 0) >= cutoff);
}

export function purgeTahfeezSessions(
  sessions: TahfeezSessionSummary[],
  now = Date.now(),
): TahfeezSessionSummary[] {
  const cutoff = historyRetentionCutoff(now);
  return sessions.filter((s) => {
    const ts = Date.parse(s.completedAt || "");
    return Number.isFinite(ts) && ts >= cutoff;
  });
}

export function retentionDaysLabel(locale: "ar" | "en"): string {
  return locale === "en" ? "30 days" : "30 يومًا";
}
