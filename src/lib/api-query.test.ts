import { describe, expect, it } from "vitest";
import { sanitizeSearchQuery } from "@/lib/api-query";

describe("sanitizeSearchQuery", () => {
  it("rejects short or empty input", () => {
    expect(sanitizeSearchQuery("")).toBeNull();
    expect(sanitizeSearchQuery("ا")).toBeNull();
    expect(sanitizeSearchQuery("  ا  ")).toBeNull();
  });

  it("strips control characters and caps length", () => {
    expect(sanitizeSearchQuery("الحمد\u0000لله")).toBe("الحمدلله");
    const long = "ا".repeat(200);
    expect(sanitizeSearchQuery(long)?.length).toBe(120);
  });
});
