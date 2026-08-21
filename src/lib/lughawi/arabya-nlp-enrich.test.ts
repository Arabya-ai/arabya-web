import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProofreadResponse } from "@/lib/lughawi/types";

vi.mock("@/lib/lughawi/arabya-nlp-client", () => ({
  arabyaNlpProofreadEnabled: vi.fn(() => true),
  arabyaNlpProofread: vi.fn(),
}));

import {
  arabyaNlpProofread,
  arabyaNlpProofreadEnabled,
} from "@/lib/lughawi/arabya-nlp-client";
import { enrichProofreadWithArabyaNlp } from "@/lib/lughawi/arabya-nlp-enrich";

const base = (): ProofreadResponse => ({
  original: "ذهب الى المدرسة",
  result: "ذهب الى المدرسة",
  edits: [],
  protectedSpans: [],
  meta: {
    engine: "lughawi-engine@test",
    usedAi: false,
    quotaCharged: 0,
    offline: true,
    stages: [],
  },
});

describe("enrichProofreadWithArabyaNlp", () => {
  beforeEach(() => {
    vi.mocked(arabyaNlpProofread).mockReset();
    vi.mocked(arabyaNlpProofreadEnabled).mockReturnValue(true);
  });

  it("merges arabya-nlp span edits into local result", async () => {
    vi.mocked(arabyaNlpProofread).mockResolvedValue({
      ok: true,
      original: "ذهب الى المدرسة",
      corrected: "ذهب إلى المدرسة",
      stage1_engine: "rule",
      stage2_engine: "ollama",
      edits: [
        {
          id: "e1",
          start: 4,
          end: 7,
          type: "spelling",
          original: "الى",
          suggestion: "إلى",
          rule_id: "ila",
          explanation: "إلى",
          stage: "rule",
        },
      ],
    });
    const out = await enrichProofreadWithArabyaNlp(base());
    expect(out.edits).toHaveLength(1);
    expect(out.edits[0]?.suggestion).toBe("إلى");
    expect(out.result).toContain("إلى");
    expect(out.meta.stages?.some((s) => s.id === "arabya-nlp")).toBe(true);
  });

  it("keeps local result when arabya-nlp unreachable", async () => {
    vi.mocked(arabyaNlpProofread).mockResolvedValue(null);
    const local = base();
    const out = await enrichProofreadWithArabyaNlp(local);
    expect(out.edits).toEqual([]);
    expect(out.result).toBe(local.result);
    expect(
      out.meta.stages?.some((s) => s.note?.includes("unreachable")),
    ).toBe(true);
  });

  it("recovers Ollama edits that arrive with start=end=0 via token search", async () => {
    const sentence = "إن المعلمون يرفعون شأن الأمة لاكن الطلاب";
    vi.mocked(arabyaNlpProofread).mockResolvedValue({
      ok: true,
      original: sentence,
      corrected: "إن المعلمين يرفعون شأن الأمة لكن الطلاب",
      stage1_engine: "builtin+inna-nasb",
      stage2_engine: "ollama:llama3.1:8b",
      edits: [
        {
          id: "llm-1",
          start: 0,
          end: 0,
          type: "grammar",
          original: "المعلمون",
          suggestion: "المعلمين",
          rule_id: "ollama-grammar",
          stage: "llm",
        },
        {
          id: "r1",
          start: 0,
          end: 0,
          type: "spelling",
          original: "لاكن",
          suggestion: "لكن",
          rule_id: "rb-1",
          stage: "rule",
        },
      ],
    });
    const local: ProofreadResponse = {
      ...base(),
      original: sentence,
      result: sentence,
    };
    const out = await enrichProofreadWithArabyaNlp(local);
    const pairs = out.edits.map((e) => `${e.original}→${e.suggestion}`);
    expect(pairs).toContain("المعلمون→المعلمين");
    expect(pairs).toContain("لاكن→لكن");
    expect(out.meta.provider).toBe("arabya-nlp");
  });
});
