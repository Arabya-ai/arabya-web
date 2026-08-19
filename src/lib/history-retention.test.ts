import { describe, expect, it } from "vitest";
import {
  ACCOUNT_HISTORY_RETENTION_MS,
  isWithinHistoryRetention,
  purgeStudyEntries,
  purgeTahfeezSessions,
} from "./history-retention";

describe("history-retention", () => {
  const now = 1_900_000_000_000;

  it("purges study entries older than 30 days", () => {
    const fresh = {
      id: "a",
      kind: "word" as const,
      title: "t",
      notes: "",
      createdAt: now - 1_000,
      updatedAt: now - 1_000,
    };
    const stale = {
      ...fresh,
      id: "b",
      updatedAt: now - ACCOUNT_HISTORY_RETENTION_MS - 1,
    };
    const out = purgeStudyEntries([fresh, stale], now);
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("a");
  });

  it("purges tahfeez sessions by completedAt", () => {
    const fresh: import("@/lib/tahfeez/types").TahfeezSessionSummary = {
      id: "s1",
      surahId: 1,
      surahName: "Fatiha",
      ayahStart: 1,
      ayahEnd: 1,
      accuracy: 90,
      correct: 1,
      wrong: 0,
      skipped: 0,
      totalWords: 1,
      durationSec: 10,
      completedAt: new Date(now - 1_000).toISOString(),
    };
    const stale = {
      ...fresh,
      id: "s2",
      completedAt: new Date(now - ACCOUNT_HISTORY_RETENTION_MS - 1).toISOString(),
    };
    expect(isWithinHistoryRetention(Date.parse(fresh.completedAt), now)).toBe(true);
    const out = purgeTahfeezSessions([fresh, stale], now);
    expect(out.map((s) => s.id)).toEqual(["s1"]);
  });
});
