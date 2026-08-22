import { describe, expect, it } from "vitest";
import {
  formatVerseKey,
  getMushafPageHref,
  localeCompareSafe,
  toArabicNumerals,
} from "@/lib/format";

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
  it("formats a verse key with eastern numerals by default", () => {
    expect(formatVerseKey("1:7")).toBe("١:٧");
  });

  it("keeps latin digits for English locale", () => {
    expect(formatVerseKey("1:7", "en")).toBe("1:7");
  });
});

describe("formatCount", () => {
  it("switches digits by locale", async () => {
    const { formatCount } = await import("@/lib/format");
    expect(formatCount(42, "ar")).toBe("٤٢");
    expect(formatCount(42, "en")).toBe("42");
  });
});

describe("getMushafPageHref", () => {
  it("builds the mushaf page href", () => {
    expect(getMushafPageHref(42)).toBe("/mushaf/42");
    expect(getMushafPageHref(1)).toBe("/mushaf/1");
  });
});

describe("localeCompareSafe", () => {
  it("does not throw when operands are missing", () => {
    expect(localeCompareSafe(undefined, "ب")).toBe(1);
    expect(localeCompareSafe("أ", undefined)).toBe(-1);
    expect(localeCompareSafe(undefined, undefined)).toBe(0);
  });

  it("sorts Arabic strings", () => {
    expect(localeCompareSafe("ب", "أ", "ar")).toBeGreaterThan(0);
  });
});
