import { describe, expect, it } from "vitest";
import {
  canAccessAdmin,
  canAccessStudio,
  canApproveAdminRole,
  isSuperAdminEmail,
  mergeRoleWithEnvAdmin,
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

  it("defaults to user and never assigns editor from email alone", () => {
    expect(resolveRoleFromEmail("reader@gmail.com", ["owner@gmail.com"])).toBe(
      "user",
    );
    expect(resolveRoleFromEmail(null, [])).toBe("user");
  });
});

describe("mergeRoleWithEnvAdmin", () => {
  it("keeps env admins as admin even if cloud says user", () => {
    expect(mergeRoleWithEnvAdmin("a@x.com", "user", ["a@x.com"])).toBe("admin");
    expect(mergeRoleWithEnvAdmin("b@x.com", "editor", ["a@x.com"])).toBe(
      "editor",
    );
    expect(mergeRoleWithEnvAdmin("b@x.com", null, [])).toBe("user");
  });

  it("treats super-admin emails as admin", () => {
    expect(mergeRoleWithEnvAdmin("egywebdev@gmail.com", "user", [])).toBe(
      "admin",
    );
    expect(mergeRoleWithEnvAdmin("arabyaaicom@gmail.com", "editor", [])).toBe(
      "admin",
    );
  });
});

describe("super admin", () => {
  it("recognizes only the two owner emails", () => {
    expect(isSuperAdminEmail("egywebdev@gmail.com")).toBe(true);
    expect(isSuperAdminEmail("arabyaaicom@gmail.com")).toBe(true);
    expect(isSuperAdminEmail("other@gmail.com")).toBe(false);
    expect(canApproveAdminRole("egywebdev@gmail.com")).toBe(true);
    expect(canApproveAdminRole("editor@gmail.com")).toBe(false);
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
