import { applySingleEdit } from "@/lib/lughawi/pipeline-client";
import { computeActive } from "@/lib/lughawi/learning-store";
import { proofreadLocal } from "@/lib/lughawi/pipeline";
import { describe, expect, it } from "vitest";

describe("applySingleEdit", () => {
  it("accepts one edit and shifts later offsets", () => {
    const text = "انا ذهبت الى البيت";
    const edits = [
      {
        id: "a",
        start: 0,
        end: 3,
        type: "spelling" as const,
        original: "انا",
        suggestion: "أنا",
        explanation: "x",
        confidence: 1,
        source: "rules" as const,
        status: "proposed" as const,
      },
      {
        id: "b",
        start: 9,
        end: 12,
        type: "spelling" as const,
        original: "الى",
        suggestion: "إلى",
        explanation: "x",
        confidence: 1,
        source: "rules" as const,
        status: "proposed" as const,
      },
    ];
    const once = applySingleEdit(text, edits, "a", "accepted");
    expect(once.text.startsWith("أنا")).toBe(true);
    expect(once.edits).toHaveLength(1);
    expect(once.edits[0]!.original).toBe("الى");
    expect(once.text.slice(once.edits[0]!.start, once.edits[0]!.end)).toBe("الى");
  });

  it("reject keeps text and marks status", () => {
    const text = "انا";
    const edits = [
      {
        id: "a",
        start: 0,
        end: 3,
        type: "spelling" as const,
        original: "انا",
        suggestion: "أنا",
        explanation: "x",
        confidence: 1,
        source: "rules" as const,
        status: "proposed" as const,
      },
    ];
    const out = applySingleEdit(text, edits, "a", "rejected");
    expect(out.text).toBe("انا");
    expect(out.edits[0]!.status).toBe("rejected");
  });
});

describe("learning activation", () => {
  it("activates only after enough accepts and a strong ratio", () => {
    expect(computeActive(1, 0)).toBe(false);
    expect(computeActive(4, 0)).toBe(false);
    expect(computeActive(5, 0)).toBe(true);
    expect(computeActive(5, 1)).toBe(true);
    expect(computeActive(5, 2)).toBe(false);
    expect(computeActive(2, 3)).toBe(false);
  });
});

describe("expanded offline proofread", () => {
  it("fixes multiple common MSA mistakes beyond the demo sentence", () => {
    const samples = [
      ["اريد رساله واضحه", ["أريد", "رسالة", "واضحة"]],
      ["اذا ذهبت الان", ["إذا", "الآن"]],
      ["هذه فكره ممتازه", ["فكرة", "ممتازة"]],
      ["لان الدراسه مهمه", ["لأن", "دراسة", "مهمة"]],
    ] as const;

    for (const [input, expectedBits] of samples) {
      const res = proofreadLocal(input, { locale: "ar" });
      for (const bit of expectedBits) {
        expect(res.result.includes(bit) || res.edits.some((e) => e.suggestion === bit)).toBe(
          true,
        );
      }
      expect(res.meta.offline).toBe(true);
    }
  });
});
