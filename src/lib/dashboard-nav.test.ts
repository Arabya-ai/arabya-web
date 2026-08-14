import { describe, expect, it } from "vitest";
import { unifiedDashNav } from "@/lib/dashboard-nav";

describe("unifiedDashNav", () => {
  it("keeps studio and tahfeez as tools inside one account group", () => {
    const nav = unifiedDashNav("member");
    const accountHrefs = nav
      .filter((item) => item.group === "groupAccount")
      .map((item) => item.href);

    expect(accountHrefs).toContain("/account");
    expect(accountHrefs).toContain("/account/tahfeez");
    expect(accountHrefs).toContain("/studio/dashboard");
    expect(nav.every((item) => item.group !== "groupStudio")).toBe(true);
    expect(nav.some((item) => item.href === "/admin/tahfeez")).toBe(false);
  });

  it("puts CRM member list under admin, not a third account", () => {
    const nav = unifiedDashNav("admin");
    const adminHrefs = nav
      .filter((item) => item.group === "groupAdmin")
      .map((item) => item.href);

    expect(adminHrefs).toContain("/admin/users");
    expect(adminHrefs).not.toContain("/admin/tahfeez");
    expect(nav.filter((item) => item.href === "/account")).toHaveLength(1);
  });
});
