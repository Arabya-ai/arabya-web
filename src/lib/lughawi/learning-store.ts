/**
 * Crowd learning for لغوي (L2 flywheel).
 * - Seed (Git): data/lughawi/learned-corrections.json
 * - Runtime: SQLite flywheel (pairs + event log) — see flywheel-db.ts
 * Accept raises a pair; reject suppresses it. High accept-ratio pairs auto-apply offline.
 */

import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import {
  countFlywheelEvents,
  getFlywheelPair,
  insertFlywheelEvent,
  listFlywheelPairs,
  listRecentAcceptedCorrections,
  lookupExactLearnedCorrection,
  upsertFlywheelPair,
} from "@/lib/lughawi/flywheel-db";

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

/** Need enough crowd votes before a pair auto-applies offline (anti-poison). */
const MIN_SAMPLES = 5;
const ACCEPT_RATIO = 0.8;

function seedPath(): string {
  return join(process.cwd(), "data", "lughawi", "learned-corrections.json");
}

function empty(): LearningFile {
  return { version: 1, pairs: [] };
}

function readSeed(): LearningFile {
  try {
    const raw = readFileSync(seedPath(), "utf8");
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

function rowToPair(r: {
  from_text: string;
  to_text: string;
  rule_id: string | null;
  accepts: number;
  rejects: number;
  active: number;
  updated_at: string;
}): LearnedPair {
  return {
    from: r.from_text,
    to: r.to_text,
    ruleId: r.rule_id ?? undefined,
    accepts: r.accepts,
    rejects: r.rejects,
    active: Boolean(r.active),
    updatedAt: r.updated_at,
  };
}

function runtimePairs(): LearnedPair[] {
  return listFlywheelPairs().map(rowToPair);
}

function mergeFiles(seed: LearningFile, runtime: LearnedPair[]): LearningFile {
  const map = new Map<string, LearnedPair>();
  for (const p of seed.pairs) {
    map.set(pairKey(p.from, p.to), { ...p });
  }
  for (const p of runtime) {
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
  if (n < MIN_SAMPLES) return false;
  return accepts / n >= ACCEPT_RATIO && accepts > rejects;
}

/** Merged view: Git seed + SQLite runtime. */
export function loadLearning(): LearningFile {
  return mergeFiles(readSeed(), runtimePairs());
}

export function getActiveLearnedPairs(): {
  from: string;
  to: string;
  ruleId?: string;
  confidence: number;
}[] {
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

function bumpPair(
  from: string,
  to: string,
  decision: "accepted" | "rejected",
  ruleId?: string,
): LearnedPair {
  const existing = getFlywheelPair(from, to);
  let accepts = existing?.accepts ?? 0;
  let rejects = existing?.rejects ?? 0;
  if (decision === "accepted") accepts += 1;
  else rejects += 1;
  const active = computeActive(accepts, rejects);
  const row = upsertFlywheelPair({
    from,
    to,
    ruleId: ruleId ?? existing?.rule_id ?? undefined,
    accepts,
    rejects,
    active,
  });
  return rowToPair(row);
}

function hashEmail(email?: string): string | undefined {
  const e = email?.trim().toLowerCase();
  if (!e) return undefined;
  const salt = process.env.LUGHAWI_LEARNING_HASH_SALT?.trim() || "arabya-lughawi";
  return createHash("sha256").update(`${salt}:${e}`).digest("hex").slice(0, 24);
}

export function recordFeedback(input: {
  from: string;
  to: string;
  decision: "accepted" | "rejected" | "custom";
  ruleId?: string;
  /** When decision is custom: user's own correction (model `to` is rejected). */
  customTo?: string;
  tier?: string;
  source?: string;
  userEmail?: string;
}): LearnedPair {
  const from = input.from.trim();
  const modelTo = input.to.trim();
  if (!from || !modelTo) {
    throw new Error("invalid feedback pair");
  }

  let row: LearnedPair;

  if (input.decision === "custom") {
    const customTo = (input.customTo ?? "").trim();
    if (!customTo || customTo === from) {
      throw new Error("invalid custom correction");
    }
    if (modelTo !== from && modelTo !== customTo) {
      bumpPair(from, modelTo, "rejected", input.ruleId);
    }
    row = bumpPair(from, customTo, "accepted", input.ruleId ?? "user-custom");
  } else {
    if (from === modelTo) throw new Error("invalid feedback pair");
    row = bumpPair(from, modelTo, input.decision, input.ruleId);
  }

  insertFlywheelEvent({
    from,
    to: modelTo,
    decision: input.decision,
    customTo: input.customTo,
    ruleId: input.ruleId,
    tier: input.tier ?? "client",
    source: input.source,
    userEmailHash: hashEmail(input.userEmail),
  });

  syncSeedFromRuntime();
  return row;
}

/** Write active pairs into data/lughawi/learned-corrections.json for Git history. */
export function syncSeedFromRuntime(): void {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.LUGHAWI_WRITE_GIT_SEED !== "1"
  ) {
    return;
  }
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
  events: number;
  backend: "sqlite";
  recentAccepted: number;
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
    events: countFlywheelEvents(),
    backend: "sqlite",
    recentAccepted: listRecentAcceptedCorrections(20).length,
  };
}

export { listRecentAcceptedCorrections, lookupExactLearnedCorrection };
