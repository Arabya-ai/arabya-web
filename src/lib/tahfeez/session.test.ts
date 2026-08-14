import { describe, expect, it } from "vitest";
import {
  extractSpeechSegments,
  freshWordResults,
  isAyahRecitationComplete,
} from "./session";

describe("isAyahRecitationComplete", () => {
  it("is false until cursor reaches word count", () => {
    expect(isAyahRecitationComplete(0, 4)).toBe(false);
    expect(isAyahRecitationComplete(3, 4)).toBe(false);
    expect(isAyahRecitationComplete(4, 4)).toBe(true);
  });

  it("is false for empty ayah", () => {
    expect(isAyahRecitationComplete(0, 0)).toBe(false);
  });
});

describe("freshWordResults", () => {
  it("builds pending rows", () => {
    const rows = freshWordResults(["a", "b"]);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === "pending")).toBe(true);
  });
});

describe("extractSpeechSegments", () => {
  function mockResults(
    rows: { text: string; final: boolean }[],
  ): ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> {
    return rows.map((r) => ({
      0: { transcript: r.text },
      isFinal: r.final,
    }));
  }

  it("reads only from resultIndex onward", () => {
    const results = mockResults([
      { text: "بسم ", final: true },
      { text: "الله ", final: true },
      { text: "الر", final: false },
    ]);
    const first = extractSpeechSegments(results, 0);
    expect(first.finalText).toBe("بسم الله");
    expect(first.interimText).toBe("الر");

    const second = extractSpeechSegments(results, 1);
    expect(second.finalText).toBe("الله");
    expect(second.interimText).toBe("الر");
  });
});
