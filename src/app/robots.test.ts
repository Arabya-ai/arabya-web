import { describe, expect, it } from "vitest";
import robots from "@/app/robots";

describe("robots.txt", () => {
  it("disallows APIs and private dashboards", () => {
    const rules = robots().rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    const disallow = rule?.disallow ?? [];
    const list = Array.isArray(disallow) ? disallow : [disallow];
    expect(list).toContain("/api/");
    expect(list).toContain("/admin/");
    expect(list).toContain("/account/");
    expect(list).toContain("/studio/");
    expect(list).toContain("/login");
  });

  it("keeps sitemap and allows public pages", () => {
    const out = robots();
    expect(out.sitemap).toBe("https://www.arabya.org/sitemap.xml");
    const rules = out.rules;
    const rule = Array.isArray(rules) ? rules[0] : rules;
    const allow = rule?.allow ?? [];
    const list = Array.isArray(allow) ? allow : [allow];
    expect(list).toContain("/");
  });
});
