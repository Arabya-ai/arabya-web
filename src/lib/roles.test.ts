import { describe, expect, it } from "vitest";
import {
  canAccessAdmin,
  canAccessStudio,
  canApproveAdminRole,
  canExportStudioWithoutBrand,
  isSuperAdminEmail,
  mergeRoleWithEnvAdmin,
  normalizeUserRole,
  parseAdminEmails,
  resolveRoleFromEmail,
  roleLabel,
} from "@/lib/roles";

describe("parseAdminEmails", () => {
  it("splits emails by comma, semicolon, or whitespace", () => {
    expect(parseAdminEmails("a@x.com, b@y.com;c@z.com")).toEqual([
      "a@x.com",
      "b@y.com",
      "c@z.com",
    ]);
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

  it("defaults to member and never assigns editor from email alone", () => {
    expect(resolveRoleFromEmail("reader@gmail.com", ["owner@gmail.com"])).toBe(
      "member",
    );
    expect(resolveRoleFromEmail(null, [])).toBe("member");
  });
});

describe("normalizeUserRole", () => {
  it("maps legacy user to member and accepts creator", () => {
    expect(normalizeUserRole("user")).toBe("member");
    expect(normalizeUserRole("member")).toBe("member");
    expect(normalizeUserRole("creator")).toBe("creator");
    expect(normalizeUserRole("editor")).toBe("editor");
    expect(normalizeUserRole("admin")).toBe("admin");
  });
});

describe("mergeRoleWithEnvAdmin", () => {
  it("keeps env admins as admin even if cloud says member", () => {
    expect(mergeRoleWithEnvAdmin("a@x.com", "member", ["a@x.com"])).toBe(
      "admin",
    );
    expect(mergeRoleWithEnvAdmin("b@x.com", "editor", ["a@x.com"])).toBe(
      "editor",
    );
    expect(mergeRoleWithEnvAdmin("b@x.com", null, [])).toBe("member");
    expect(mergeRoleWithEnvAdmin("c@x.com", "user", [])).toBe("member");
  });

  it("treats super-admin emails as admin", () => {
    expect(mergeRoleWithEnvAdmin("egywebdev@gmail.com", "member", [])).toBe(
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
  it("labels roles by locale", () => {
    expect(roleLabel("admin", "ar")).toBe("مدير");
    expect(roleLabel("editor", "ar")).toBe("محرر");
    expect(roleLabel("creator", "ar")).toBe("مؤلف");
    expect(roleLabel("member", "ar")).toBe("مسجل");
    expect(roleLabel("admin", "en")).toBe("Admin");
    expect(roleLabel("creator", "en")).toBe("Creator");
    expect(roleLabel("member", "en")).toBe("Member");
  });

  it("gates studio and admin access", () => {
    expect(canAccessStudio("member")).toBe(true);
    expect(canAccessStudio("creator")).toBe(true);
    expect(canAccessStudio("editor")).toBe(true);
    expect(canAccessStudio("admin")).toBe(true);
    expect(canAccessAdmin("editor")).toBe(false);
    expect(canAccessAdmin("admin")).toBe(true);
  });

  it("allows brand-free export for creator/editor/admin/super-admin only", () => {
    expect(canExportStudioWithoutBrand("member")).toBe(false);
    expect(canExportStudioWithoutBrand("creator")).toBe(true);
    expect(canExportStudioWithoutBrand("editor")).toBe(true);
    expect(canExportStudioWithoutBrand("admin")).toBe(true);
    expect(
      canExportStudioWithoutBrand("member", "egywebdev@gmail.com"),
    ).toBe(true);
  });
});
