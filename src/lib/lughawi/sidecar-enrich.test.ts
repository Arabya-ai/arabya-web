import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProofreadResponse } from "@/lib/lughawi/types";

vi.mock("@/lib/lughawi/sidecar-client", () => ({
  sidecarGec: vi.fn(),
}));

import { sidecarGec } from "@/lib/lughawi/sidecar-client";
import { enrichProofreadWithSidecar } from "@/lib/lughawi/sidecar-enrich";

const base = (): ProofreadResponse => ({
  original: "ذهب الى المدرسة",
  result: "ذهب الى المدرسة",
  edits: [],
  protectedSpans: [],
  meta: {
    engine: "lughawi-engine@1.3.2",
    usedAi: false,
    quotaCharged: 0,
    offline: true,
    stages: [],
  },
});

describe("enrichProofreadWithSidecar", () => {
  beforeEach(() => {
    vi.mocked(sidecarGec).mockReset();
  });

  it("merges sidecar span edits into local result", async () => {
    vi.mocked(sidecarGec).mockResolvedValue({
      engine: "rules-nlp:builtin",
      edits: [
        {
          start: 4,
          end: 7,
          type: "spelling",
          original: "الى",
          suggestion: "إلى",
          ruleId: "rb-ila",
          explanation: "إلى",
          confidence: 0.9,
        },
      ],
    });
    const out = await enrichProofreadWithSidecar(base());
    expect(out.edits).toHaveLength(1);
    expect(out.edits[0]?.suggestion).toBe("إلى");
    expect(out.edits[0]?.source).toBe("gec");
    expect(out.result).toContain("إلى");
    expect(out.meta.stages?.some((s) => s.id === "sidecar-nlp")).toBe(true);
  });

  it("keeps local result when sidecar unreachable", async () => {
    vi.mocked(sidecarGec).mockResolvedValue(null);
    const local = base();
    const out = await enrichProofreadWithSidecar(local);
    expect(out.edits).toEqual([]);
    expect(out.result).toBe(local.result);
  });
});
