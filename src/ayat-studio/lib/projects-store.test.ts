import { describe, expect, it } from "vitest";
import { formatProjectDate } from "@/ayat-studio/lib/projects-store";

describe("formatProjectDate", () => {
  it("returns em dash for missing or invalid dates", () => {
    expect(formatProjectDate(undefined)).toBe("—");
    expect(formatProjectDate("")).toBe("—");
    expect(formatProjectDate("not-a-date")).toBe("—");
  });

  it("formats valid ISO timestamps", () => {
    const out = formatProjectDate("2024-06-15T12:00:00.000Z", "en-US");
    expect(out).not.toBe("—");
    expect(out).toMatch(/2024/);
  });
});
