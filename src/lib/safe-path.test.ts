import { describe, expect, it } from "vitest";
import { safeInternalPath } from "@/lib/safe-path";

describe("safeInternalPath", () => {
  it("allows relative app paths", () => {
    expect(safeInternalPath("/studio")).toBe("/studio");
    expect(safeInternalPath("/en/account")).toBe("/en/account");
  });

  it("rejects open redirects", () => {
    expect(safeInternalPath("//evil.com")).toBe("/");
    expect(safeInternalPath("https://evil.com")).toBe("/");
    expect(safeInternalPath("\\evil")).toBe("/");
    expect(safeInternalPath(null, "/login")).toBe("/login");
  });
});
