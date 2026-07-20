import { describe, expect, it } from "vitest";
import { formatVerseKey, getMushafPageHref, toArabicNumerals } from "@/lib/format";

describe("toArabicNumerals", () => {
  it("converts western digits to eastern arabic digits", () => {
    expect(toArabicNumerals(1234567890)).toBe("١٢٣٤٥٦٧٨٩٠");
  });

  it("keeps non-digit characters untouched", () => {
    expect(toArabicNumerals("2:255")).toBe("٢:٢٥٥");
    expect(toArabicNumerals("page-10")).toBe("page-١٠");
  });

  it("accepts numeric input", () => {
    expect(toArabicNumerals(7)).toBe("٧");
  });
});

describe("formatVerseKey", () => {
  it("formats a verse key with eastern numerals", () => {
    expect(formatVerseKey("1:7")).toBe("١:٧");
  });
});

describe("getMushafPageHref", () => {
  it("builds the mushaf page href", () => {
    expect(getMushafPageHref(42)).toBe("/mushaf/42");
    expect(getMushafPageHref(1)).toBe("/mushaf/1");
  });
});
