import { describe, expect, it } from "vitest";
import { localizedHref } from "@/i18n/locale-params";

describe("localizedHref", () => {
  it("keeps Arabic paths unprefixed", () => {
    expect(localizedHref("/login", "ar")).toBe("/login");
    expect(localizedHref("/studio/ai", "ar")).toBe("/studio/ai");
  });

  it("prefixes English paths with /en", () => {
    expect(localizedHref("/login", "en")).toBe("/en/login");
    expect(localizedHref("/", "en")).toBe("/en");
  });
});
