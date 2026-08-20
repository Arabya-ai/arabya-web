import { runProofreadEngine } from "@/lib/lughawi/engine/core";
import { applyEdits, mergeEdits } from "@/lib/lughawi/pipeline-merge";
import type { ProofreadOptions, ProofreadResponse } from "@/lib/lughawi/types";

export { applyEdits, mergeEdits };

/** Local hybrid proofread — free, no AI. Delegates to staged engine core. */
export function proofreadLocal(
  text: string,
  options: ProofreadOptions = {},
): ProofreadResponse {
  return runProofreadEngine(text, options);
}
