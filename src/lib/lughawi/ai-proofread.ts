/**
 * Optional AI enrichment for proofread — runs after offline rules.
 * Never throws to the client: on failure the caller keeps local results.
 */

import {
  runAiAuto,
  type AiCandidate,
} from "@/lib/lughawi/ai-gateway";
import { applyEdits, mergeEdits } from "@/lib/lughawi/pipeline-merge";
import type { LughawiEdit, ProofreadResponse } from "@/lib/lughawi/types";

/** Soft wall so Contabo Auto cannot hang the Correct button for 90s. */
const AI_PROOFREAD_TIMEOUT_MS = 10_000;

function stripCodeFence(raw: string): string {
  const t = raw.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return (m?.[1] ?? t).trim();
}

function parseAiPairs(
  raw: string,
): { from: string; to: string; type?: string }[] {
  const cleaned = stripCodeFence(raw);
  try {
    const json = JSON.parse(cleaned) as unknown;
    if (!Array.isArray(json)) return [];
    const out: { from: string; to: string; type?: string }[] = [];
    for (const row of json) {
      if (!row || typeof row !== "object") continue;
      const from =
        typeof (row as { from?: unknown }).from === "string"
          ? (row as { from: string }).from.trim()
          : typeof (row as { original?: unknown }).original === "string"
            ? (row as { original: string }).original.trim()
            : "";
      const to =
        typeof (row as { to?: unknown }).to === "string"
          ? (row as { to: string }).to.trim()
          : typeof (row as { suggestion?: unknown }).suggestion === "string"
            ? (row as { suggestion: string }).suggestion.trim()
            : "";
      if (!from || !to || from === to) continue;
      out.push({ from, to });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Drop person/gender flips that invent wrong conjugation
 * (e.g. ساعد → ساعدت) when the stem was already fine.
 */
export function isUnsafeAiMorphFlip(from: string, to: string): boolean {
  if (!from || !to || from === to) return false;
  const suffixes = ["ت", "تم", "تن", "وا", "ين", "ان", "ون", "نا"];
  for (const suf of suffixes) {
    if (to === from + suf) return true;
    if (from === to + suf && from.length > to.length) return true;
  }
  return false;
}

function locatePairs(
  text: string,
  pairs: { from: string; to: string }[],
  startId: number,
): LughawiEdit[] {
  const edits: LughawiEdit[] = [];
  const claimed = new Set<string>();
  let seq = startId;
  for (const p of pairs) {
    let fromIndex = 0;
    while (fromIndex < text.length) {
      const idx = text.indexOf(p.from, fromIndex);
      if (idx < 0) break;
      const end = idx + p.from.length;
      const key = `${idx}:${end}`;
      fromIndex = end;
      if (claimed.has(key)) continue;
      // Prefer whole-token hits (Arabic letter boundaries).
      const before = idx === 0 ? "" : text[idx - 1]!;
      const after = end >= text.length ? "" : text[end]!;
      const isLetter = (c: string) => /[\u0600-\u06FFa-zA-Z0-9]/.test(c);
      if (isLetter(before) || isLetter(after)) continue;
      claimed.add(key);
      seq += 1;
      edits.push({
        id: `ai-${seq}`,
        start: idx,
        end,
        type: "spelling",
        original: p.from,
        suggestion: p.to,
        ruleId: "ai-spelling",
        explanation: "اقتراح من وضع Auto (مفاتيح المشروع أو مفتاحك).",
        confidence: 0.82,
        source: "ai",
        status: "proposed",
      });
      break; // one occurrence per pair unless repeated intentionally
    }
  }
  return edits;
}

async function runAiAutoWithTimeout(
  args: Parameters<typeof runAiAuto>[0],
  timeoutMs: number,
): Promise<Awaited<ReturnType<typeof runAiAuto>>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      runAiAuto(args),
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`ai-proofread-timeout:${timeoutMs}`)),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Ask Auto for remaining spelling/grammar fixes as JSON pairs, merge with local.
 */
export async function enrichProofreadWithAi(
  local: ProofreadResponse,
  candidates: AiCandidate[],
): Promise<ProofreadResponse> {
  if (!candidates.length) return local;

  const system =
    "أنت مدقق إملائي عربي فصيح حذر. أعد فقط مصفوفة JSON من أزواج التصحيح دون شرح. " +
    'الشكل: [{"from":"كلمة خاطئة","to":"كلمة صحيحة"}]. ' +
    "صحّح الهمزات والتاء المربوطة وياء/ألف حرف الجر والأسماء (أحمد، علي، في، المدرسة، بقرة لا بقره، تقرأ لا تقرا). " +
    "انصب المفعول به عند اللزوم (كتابًا بعد تقرأ/يقرأ). " +
    "لا تغيّر تصريف فعل صحيح المعنى (ساعد يبقى ساعد — ممنوع ساعدت/ساعدوا). " +
    "لا تُعد صياغة الجملة ولا تضف كلمات جديدة ولا تغيّر الجنس أو العدد دون خطأ واضح.";

  const user =
    `النص:\n${local.original}\n\n` +
    `التصحيحات المحلية الحالية (لا تكررها إن كانت صحيحة):\n` +
    (local.edits.length
      ? local.edits.map((e) => `${e.original} → ${e.suggestion}`).join("\n")
      : "(لا يوجد)");

  let raw = "";
  let provider: string | undefined;
  let model: string | undefined;
  let attempts: number | undefined;
  try {
    const out = await runAiAutoWithTimeout(
      {
        candidates,
        system,
        user,
        maxTokens: 800,
      },
      AI_PROOFREAD_TIMEOUT_MS,
    );
    raw = out.text;
    provider = out.provider;
    model = out.model;
    attempts = out.attempts;
  } catch {
    return {
      ...local,
      meta: {
        ...local.meta,
        warning:
          local.meta.warning ??
          "تخطي Auto لتسريع النتيجة — التدقيق المحلي مكتمل.",
      },
    };
  }

  const pairs = parseAiPairs(raw).filter((p) => {
    if (isUnsafeAiMorphFlip(p.from, p.to)) return false;
    // Never let AI undo a local high-confidence fix (e.g. علي ← على name rule).
    const undoesLocal = local.edits.some(
      (e) => e.suggestion === p.from && e.original === p.to,
    );
    return !undoesLocal;
  });
  if (!pairs.length) {
    return {
      ...local,
      meta: {
        ...local.meta,
        usedAi: true,
        offline: false,
        provider,
        warning:
          attempts && attempts > 1
            ? `Auto حاول ${attempts} مزودين دون أزواج صالحة`
            : local.meta.warning,
      },
    };
  }

  const aiEdits = locatePairs(local.original, pairs, local.edits.length);
  const merged = mergeEdits([local.edits, aiEdits]);
  const result = applyEdits(local.original, merged);

  return {
    ...local,
    result,
    edits: merged,
    meta: {
      ...local.meta,
      usedAi: true,
      offline: false,
      provider,
      engine: `${local.meta.engine}+ai-auto`,
      warning:
        attempts && attempts > 1
          ? `Auto حاول ${attempts} مزودين`
          : model
            ? undefined
            : local.meta.warning,
    },
  };
}
