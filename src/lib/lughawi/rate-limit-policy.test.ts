import { describe, expect, it } from "vitest";
import { sessionSkipsLughawiRateLimit } from "@/lib/lughawi/rate-limit-policy";

describe("sessionSkipsLughawiRateLimit", () => {
  it("skips for verified admin and editor", () => {
    expect(
      sessionSkipsLughawiRateLimit({
        user: { role: "admin" },
        expires: "",
      } as never),
    ).toBe(true);
    expect(
      sessionSkipsLughawiRateLimit({
        user: { role: "editor" },
        expires: "",
      } as never),
    ).toBe(true);
  });

  it("does not skip guests or unverified elevated roles", () => {
    expect(sessionSkipsLughawiRateLimit(null)).toBe(false);
    expect(
      sessionSkipsLughawiRateLimit({
        user: { role: "member" },
        expires: "",
      } as never),
    ).toBe(false);
    expect(
      sessionSkipsLughawiRateLimit({
        user: { role: "admin", roleUnverified: true },
        expires: "",
      } as never),
    ).toBe(false);
  });
});
