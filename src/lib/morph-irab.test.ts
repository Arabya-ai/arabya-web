import { describe, expect, it } from "vitest";
import { formatFeatureLabels, formatPosLabels } from "@/lib/morph-labels";
import { narrativeIrab } from "@/lib/irab-narrative";
import type { IrabWord } from "@/lib/types";

describe("formatPosLabels", () => {
  it("maps common POS codes to Arabic", () => {
    expect(formatPosLabels(["N"], [])).toContain("اسم");
    expect(formatPosLabels(["V"], ["PERF"])).toBeTruthy();
  });
});

describe("formatFeatureLabels", () => {
  it("maps case and tense features", () => {
    const labels = formatFeatureLabels(["NOM", "PERF"]);
    expect(labels).toMatch(/مرفوع|ماض/);
  });
});

describe("narrativeIrab", () => {
  it("returns dash when morph is missing", () => {
    expect(narrativeIrab(null)).toBe("—");
    expect(narrativeIrab(undefined)).toBe("—");
  });

  it("builds Arabic prose from QAC-like tags", () => {
    const morph: IrabWord = {
      position: 1,
      wordId: "W:001:001:002",
      segments: "N",
      pos: ["N"],
      features: ["GEN"],
      surface: "ٱللَّهِ",
      root: "اله",
      lemma: "الله",
      irab: "",
    };
    const text = narrativeIrab(morph);
    expect(text.length).toBeGreaterThan(2);
    expect(text).not.toBe("—");
  });
});
