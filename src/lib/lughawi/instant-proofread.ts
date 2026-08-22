import { runInstantProofreadEngine } from "@/lib/lughawi/engine/instant-client";
import type { LughawiEdit, ProofreadOptions } from "@/lib/lughawi/types";

/** Debounce for client-only instant hints (no server round-trip). */
export const LUGHAWI_INSTANT_DEBOUNCE_MS = 300;

export function instantProofreadLocal(
  text: string,
  options: Pick<ProofreadOptions, "locale" | "proofMode"> = {},
): LughawiEdit[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return runInstantProofreadEngine(text, {
    locale: options.locale ?? "ar",
    proofMode: options.proofMode ?? "full",
  });
}
