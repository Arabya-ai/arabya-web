import type { AiCandidate } from "@/lib/lughawi/ai-gateway";
import { buildAutoCandidates } from "@/lib/lughawi/ai-gateway";
import { listProviderStatus, getUserApiKey } from "@/lib/lughawi/credentials-store";
import type { AiProviderId } from "@/lib/lughawi/types";

/** Collect all configured user keys as Auto candidates (never expose raw keys outside). */
export function userAiCandidates(userId: string): AiCandidate[] {
  const status = listProviderStatus(userId);
  const out: AiCandidate[] = [];
  for (const row of status) {
    if (!row.configured) continue;
    const full = getUserApiKey(userId, row.id);
    if (!full) continue;
    out.push({
      provider: full.provider,
      apiKey: full.apiKey,
      source: "user",
    });
  }
  // Prefer default first
  const def = status.find((s) => s.isDefault)?.id;
  if (def) {
    out.sort((a, b) =>
      a.provider === def ? -1 : b.provider === def ? 1 : 0,
    );
  }
  return out;
}

export function resolveLughawiAiCandidates(opts: {
  userId: string;
  /** "auto" | provider id */
  mode?: string | null;
}): { candidates: AiCandidate[]; chargeProject: boolean; mode: string } {
  const mode = (opts.mode ?? "auto").trim().toLowerCase() || "auto";
  const userKeys = userAiCandidates(opts.userId);

  if (mode !== "auto" && mode) {
    const pinned = userKeys.find((c) => c.provider === mode);
    if (pinned) {
      return {
        candidates: [pinned],
        chargeProject: false,
        mode,
      };
    }
    // Fall through to project Auto but prefer requested provider
    const candidates = buildAutoCandidates({
      userCandidates: userKeys,
      preferProvider: mode as AiProviderId,
    });
    return {
      candidates,
      chargeProject: userKeys.length === 0,
      mode: "auto",
    };
  }

  const candidates = buildAutoCandidates({ userCandidates: userKeys });
  return {
    candidates,
    chargeProject: userKeys.length === 0,
    mode: "auto",
  };
}
