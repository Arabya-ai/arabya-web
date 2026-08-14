/** Shared types for Arabya smart tasmeeʿ (تحفيظ / تسميع ذكي). */

export type TahfeezWordStatus =
  | "pending"
  | "correct"
  | "wrong"
  | "skipped"
  | "hesitation";

export type TahfeezWordResult = {
  index: number;
  text: string;
  status: TahfeezWordStatus;
};

export type TahfeezSessionSummary = {
  id: string;
  surahId: number;
  surahName: string;
  ayahStart: number;
  ayahEnd: number;
  accuracy: number;
  correct: number;
  wrong: number;
  skipped: number;
  totalWords: number;
  durationSec: number;
  completedAt: string;
};

export type TahfeezPortfolioStats = {
  pagesCompleted: number;
  pagesInProgress: number;
  totalSessions: number;
  overallAccuracy: number;
  totalCorrectWords: number;
  totalWrongWords: number;
  lastSurahId: number | null;
  lastAyah: number | null;
  updatedAt: string;
};

export type TahfeezPortfolio = {
  stats: TahfeezPortfolioStats;
  sessions: TahfeezSessionSummary[];
};

export function emptyTahfeezStats(): TahfeezPortfolioStats {
  return {
    pagesCompleted: 0,
    pagesInProgress: 0,
    totalSessions: 0,
    overallAccuracy: 0,
    totalCorrectWords: 0,
    totalWrongWords: 0,
    lastSurahId: null,
    lastAyah: null,
    updatedAt: new Date().toISOString(),
  };
}

export function emptyTahfeezPortfolio(): TahfeezPortfolio {
  return { stats: emptyTahfeezStats(), sessions: [] };
}
