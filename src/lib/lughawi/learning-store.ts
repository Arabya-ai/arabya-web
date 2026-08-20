/**
 * Crowd learning for لغوي.
 * - Seed (Git): data/lughawi/learned-corrections.json
 * - Runtime tallies (server disk, not overwritten lightly): .data/lughawi-learning.json
 * Accept raises a pair; reject suppresses it. High accept-ratio pairs auto-apply offline.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface LearnedPair {
  from: string;
  to: string;
  ruleId?: string;
  accepts: number;
  rejects: number;
  /** When true, pair is used in offline auto-correct */
  active: boolean;
  updatedAt: string;
}

export interface LearningFile {
  version: 1;
  pairs: LearnedPair[];
}

const MIN_SAMPLES = 2;
const ACCEPT_RATIO = 0.66;

function seedPath(): string {
  return join(process.cwd(), "data", "lughawi", "learned-corrections.json");
}

function runtimePath(): string {
  return (
    process.env.LUGHAWI_LEARNING_PATH?.trim() ||
    join(process.cwd(), ".data", "lughawi-learning.json")
  );
}

function empty(): LearningFile {
  return { version: 1, pairs: [] };
}

function readJson(path: string): LearningFile {
  try {
    const raw = readFileSync(path, "utf8");
    const parsed = JSON.parse(raw) as LearningFile;
    if (!Array.isArray(parsed.pairs)) return empty();
    return { version: 1, pairs: parsed.pairs };
  } catch {
    return empty();
  }
}

function writeJson(path: string, file: LearningFile) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(file, null, 2) + "\n", "utf8");
}

function pairKey(from: string, to: string): string {
  return `${from}\u0000${to}`;
}

function mergeFiles(seed: LearningFile, runtime: LearningFile): LearningFile {
  const map = new Map<string, LearnedPair>();
  for (const p of seed.pairs) {
    map.set(pairKey(p.from, p.to), { ...p });
  }
  for (const p of runtime.pairs) {
    // Runtime tallies are authoritative for live learning.
    map.set(pairKey(p.from, p.to), { ...p });
  }
  const pairs = [...map.values()].map((p) => ({
    ...p,
    active: computeActive(p.accepts, p.rejects),
  }));
  return { version: 1, pairs };
}

export function computeActive(accepts: number, rejects: number): boolean {
  const n = accepts + rejects;
  if (n < MIN_SAMPLES) return accepts >= 1 && rejects === 0;
  return accepts / n >= ACCEPT_RATIO && accepts >= rejects;
}

/** Merged view: Git seed + runtime learning. */
export function loadLearning(): LearningFile {
  return mergeFiles(readJson(seedPath()), readJson(runtimePath()));
}

export function getActiveLearnedPairs(): { from: string; to: string; ruleId?: string; confidence: number }[] {
  return loadLearning()
    .pairs.filter((p) => p.active && p.from !== p.to && p.from.length > 0)
    .map((p) => {
      const n = p.accepts + p.rejects;
      const ratio = n ? p.accepts / n : 0.7;
      return {
        from: p.from,
        to: p.to,
        ruleId: p.ruleId ?? "learned",
        confidence: Math.min(0.98, 0.55 + ratio * 0.4),
      };
    });
}

/** Pairs suppressed by crowd rejects — skip even if in hard-coded rules. */
export function getSuppressedPairs(): Set<string> {
  const set = new Set<string>();
  for (const p of loadLearning().pairs) {
    const n = p.accepts + p.rejects;
    if (n >= MIN_SAMPLES && p.rejects / n > 0.55) {
      set.add(pairKey(p.from, p.to));
    }
  }
  return set;
}

export function isPairSuppressed(from: string, to: string): boolean {
  return getSuppressedPairs().has(pairKey(from, to));
}

export function recordFeedback(input: {
  from: string;
  to: string;
  decision: "accepted" | "rejected";
  ruleId?: string;
}): LearnedPair {
  const from = input.from.trim();
  const to = input.to.trim();
  if (!from || !to || from === to) {
    throw new Error("invalid feedback pair");
  }

  const runtime = readJson(runtimePath());
  let row = runtime.pairs.find((p) => p.from === from && p.to === to);
  if (!row) {
    row = {
      from,
      to,
      ruleId: input.ruleId,
      accepts: 0,
      rejects: 0,
      active: false,
      updatedAt: new Date().toISOString(),
    };
    runtime.pairs.push(row);
  }
  if (input.decision === "accepted") row.accepts += 1;
  else row.rejects += 1;
  row.ruleId = input.ruleId ?? row.ruleId;
  row.active = computeActive(row.accepts, row.rejects);
  row.updatedAt = new Date().toISOString();
  writeJson(runtimePath(), runtime);

  // Promote active high-confidence pairs into Git seed file (project memory).
  syncSeedFromRuntime();
  return row;
}

/** Write active pairs into data/lughawi/learned-corrections.json for Git history. */
export function syncSeedFromRuntime(): void {
  const merged = loadLearning();
  const seed: LearningFile = {
    version: 1,
    pairs: merged.pairs
      .filter((p) => p.accepts + p.rejects > 0)
      .sort((a, b) => b.accepts - a.accepts || a.from.localeCompare(b.from, "ar"))
      .slice(0, 5000),
  };
  writeJson(seedPath(), seed);
}

export function learningStats(): {
  pairs: number;
  active: number;
  suppressed: number;
} {
  const file = loadLearning();
  const suppressed = file.pairs.filter((p) => {
    const n = p.accepts + p.rejects;
    return n >= MIN_SAMPLES && p.rejects / n > 0.55;
  }).length;
  return {
    pairs: file.pairs.length,
    active: file.pairs.filter((p) => p.active).length,
    suppressed,
  };
}
