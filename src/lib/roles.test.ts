import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  canAccessAdmin,
  canAccessEditorialTools,
  canAccessStudio,
  canApproveAdminRole,
  canAssignRole,
  canExportStudioWithoutBrand,
  canExportUnlimitedStudioAyahs,
  dailyVideoExportLimit,
  getEnvSuperAdminEmails,
  getSuperAdminEmails,
  getSuperAdminEnvDiagnostics,
  isEnvBootstrapSuperAdmin,
  isSuperAdminEmail,
  mergeRoleWithEnvAdmin,
  normalizeUserRole,
  parseAdminEmails,
  registerSuperAdminUiAllowlist,
  resolveRoleFromEmail,
  roleLabel,
  MEMBER_DAILY_VIDEO_EXPORT_LIMIT,
} from "@/lib/roles";

const SUPER_A = "super@example.com";
const SUPER_B = "owner@example.com";

beforeEach(() => {
  process.env.ARABYA_ADMIN_EMAILS = `${SUPER_A},${SUPER_B}`;
  registerSuperAdminUiAllowlist(() => []);
});

afterEach(() => {
  delete process.env.ARABYA_ADMIN_EMAILS;
  registerSuperAdminUiAllowlist(() => []);
});

describe("parseAdminEmails", () => {
  it("splits emails by comma, semicolon, or whitespace", () => {
    expect(parseAdminEmails("a@x.com, b@y.com;c@z.com")).toEqual([
      "a@x.com",
      "b@y.com",
      "c@z.com",
    ]);
  });
});

describe("getSuperAdminEnvDiagnostics", () => {
  it("counts configured emails without exposing them", () => {
    const diag = getSuperAdminEnvDiagnostics(SUPER_A);
    expect(diag.configuredCount).toBe(2);
    expect(diag.envCount).toBe(2);
    expect(diag.configured).toBe(true);
    expect(diag.currentEmailInList).toBe(true);
    expect(diag).not.toHaveProperty("emails");
  });

  it("reports when session email is not in allowlist", () => {
    const diag = getSuperAdminEnvDiagnostics("other@x.com");
    expect(diag.currentEmailInList).toBe(false);
  });
});

describe("getSuperAdminEmails", () => {
  it("reads from ARABYA_ADMIN_EMAILS and merges UI allowlist", () => {
    expect(getEnvSuperAdminEmails()).toEqual([SUPER_A, SUPER_B]);
    expect(getSuperAdminEmails()).toEqual([SUPER_A, SUPER_B]);
    registerSuperAdminUiAllowlist(() => ["ui-admin@x.com"]);
    expect(getSuperAdminEmails()).toEqual([
      SUPER_A,
      SUPER_B,
      "ui-admin@x.com",
    ]);
  });

  it("fail-closed when env empty and no UI list", () => {
    delete process.env.ARABYA_ADMIN_EMAILS;
    expect(getSuperAdminEmails()).toEqual([]);
    expect(isSuperAdminEmail(SUPER_A)).toBe(false);
  });
});

describe("resolveRoleFromEmail", () => {
  it("only super-admin emails become admin", () => {
    expect(resolveRoleFromEmail(SUPER_A)).toBe("admin");
    expect(resolveRoleFromEmail("reader@gmail.com")).toBe("member");
  });
});

describe("mergeRoleWithEnvAdmin", () => {
  it("forces super-admin email to admin", () => {
    expect(mergeRoleWithEnvAdmin(SUPER_A, "member")).toBe("admin");
  });

  it("keeps CRM-promoted admin role when email is on UI allowlist", () => {
    registerSuperAdminUiAllowlist(() => ["promoted@x.com"]);
    expect(mergeRoleWithEnvAdmin("promoted@x.com", "member")).toBe("admin");
  });

  it("keeps stored admin when not on allowlist (session until re-verify)", () => {
    expect(mergeRoleWithEnvAdmin("other@x.com", "admin")).toBe("admin");
  });

  it("maps legacy user to member", () => {
    expect(mergeRoleWithEnvAdmin("b@x.com", "user")).toBe("member");
  });
});

describe("role gates", () => {
  it("labels admin as super admin", () => {
    expect(roleLabel("admin", "ar")).toBe("سوبر أدمن");
    expect(roleLabel("admin", "en")).toBe("Super Admin");
    expect(roleLabel("member", "ar")).toBe("مسجل");
  });

  it("studio for all; editorial tools for editor/admin only", () => {
    expect(canAccessStudio("creator")).toBe(true);
    expect(canAccessStudio("member")).toBe(true);
    expect(canAccessEditorialTools("creator")).toBe(false);
    expect(canAccessEditorialTools("member")).toBe(false);
    expect(canAccessEditorialTools("editor")).toBe(true);
    expect(canAccessEditorialTools("admin")).toBe(true);
    expect(canAccessAdmin("admin")).toBe(true);
    expect(canAccessAdmin("editor")).toBe(false);
  });

  it("export brand and ayah rules", () => {
    expect(canExportStudioWithoutBrand("member")).toBe(false);
    expect(canExportStudioWithoutBrand("creator")).toBe(true);
    expect(canExportStudioWithoutBrand("editor")).toBe(true);
    expect(canExportUnlimitedStudioAyahs("member")).toBe(false);
    expect(canExportUnlimitedStudioAyahs("creator")).toBe(true);
    expect(canExportUnlimitedStudioAyahs("editor")).toBe(true);
    expect(dailyVideoExportLimit("member")).toBe(MEMBER_DAILY_VIDEO_EXPORT_LIMIT);
    expect(dailyVideoExportLimit("creator")).toBeNull();
    expect(dailyVideoExportLimit("editor")).toBeNull();
  });

  it("super admin may promote anyone to admin; env bootstrap cannot demote", () => {
    expect(canApproveAdminRole(SUPER_A)).toBe(true);
    expect(canApproveAdminRole("editor@gmail.com")).toBe(false);
    expect(canAssignRole("editor@x.com", "member")).toBe(false);
    expect(
      canAssignRole(SUPER_A, "creator", {
        targetEmail: "a@b.com",
      }),
    ).toBe(true);
    expect(
      canAssignRole(SUPER_A, "member", {
        targetEmail: SUPER_B,
      }),
    ).toBe(false);
    expect(isEnvBootstrapSuperAdmin(SUPER_B)).toBe(true);
    expect(
      canAssignRole(SUPER_A, "editor", {
        targetEmail: SUPER_A,
        actorEmail: SUPER_A,
      }),
    ).toBe(false);
    expect(
      canAssignRole(SUPER_A, "admin", {
        targetEmail: "random@x.com",
      }),
    ).toBe(true);
    expect(
      canAssignRole(SUPER_A, "admin", {
        targetEmail: SUPER_B,
      }),
    ).toBe(true);
  });

  it("normalizes roles", () => {
    expect(normalizeUserRole("user")).toBe("member");
    expect(isSuperAdminEmail(SUPER_B)).toBe(true);
  });
});
