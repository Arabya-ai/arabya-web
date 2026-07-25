import { describe, expect, it } from "vitest";
import { parsePexelsKeys, shouldRotatePexelsKey } from "@/lib/pexels-keys";

describe("parsePexelsKeys", () => {
  it("splits comma-separated keys and dedupes", () => {
    expect(parsePexelsKeys("a, b;c\nd", "b,e")).toEqual([
      "a",
      "b",
      "c",
      "d",
      "e",
    ]);
  });

  it("ignores empty chunks", () => {
    expect(parsePexelsKeys(" ,a,, ", undefined, "")).toEqual(["a"]);
  });
});

describe("shouldRotatePexelsKey", () => {
  it("rotates on auth and rate-limit statuses", () => {
    expect(shouldRotatePexelsKey(401)).toBe(true);
    expect(shouldRotatePexelsKey(429)).toBe(true);
    expect(shouldRotatePexelsKey(500)).toBe(false);
  });
});
