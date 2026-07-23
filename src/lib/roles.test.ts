import { describe, expect, it } from "vitest";
import {
  canAccessAdmin,
  canAccessStudio,
  parseAdminEmails,
  resolveRoleFromEmail,
  roleLabelAr,
} from "@/lib/roles";

describe("parseAdminEmails", () => {
  it("splits emails by comma, semicolon, or whitespace", () => {
    expect(parseAdminEmails("a@x.com, b@y.com;c@z.com")).toEqual([
      "a@x.com",
      "b@y.com",
      "c@z.com",
    ]);
  });

  it("returns empty list for blank input", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("  ")).toEqual([]);
  });
});

describe("resolveRoleFromEmail", () => {
  it("marks listed emails as admin", () => {
    expect(resolveRoleFromEmail("Owner@Gmail.com", ["owner@gmail.com"])).toBe(
      "admin",
    );
  });

  it("defaults to user", () => {
    expect(resolveRoleFromEmail("reader@gmail.com", ["owner@gmail.com"])).toBe(
      "user",
    );
    expect(resolveRoleFromEmail(null, [])).toBe("user");
  });
});

describe("role helpers", () => {
  it("labels roles in Arabic", () => {
    expect(roleLabelAr("admin")).toBe("مدير");
    expect(roleLabelAr("editor")).toBe("محرر");
    expect(roleLabelAr("user")).toBe("مشترك");
  });

  it("gates studio and admin access", () => {
    expect(canAccessStudio("user")).toBe(false);
    expect(canAccessStudio("editor")).toBe(true);
    expect(canAccessStudio("admin")).toBe(true);
    expect(canAccessAdmin("editor")).toBe(false);
    expect(canAccessAdmin("admin")).toBe(true);
  });
});
