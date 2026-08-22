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
  getSuperAdminEmails,
  getSuperAdminEnvDiagnostics,
  isSuperAdminEmail,
  mergeRoleWithEnvAdmin,
  normalizeUserRole,
  parseAdminEmails,
  resolveRoleFromEmail,
  roleLabel,
  MEMBER_DAILY_VIDEO_EXPORT_LIMIT,
} from "@/lib/roles";

const SUPER_A = "super@example.com";
const SUPER_B = "owner@example.com";

beforeEach(() => {
  process.env.ARABYA_ADMIN_EMAILS = `${SUPER_A},${SUPER_B}`;
});

afterEach(() => {
  delete process.env.ARABYA_ADMIN_EMAILS;
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
  it("reads only from ARABYA_ADMIN_EMAILS", () => {
    expect(getSuperAdminEmails()).toEqual([SUPER_A, SUPER_B]);
  });

  it("fail-closed when env empty", () => {
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

  it("demotes non–super-admin cloud admin to editor", () => {
    expect(mergeRoleWithEnvAdmin("other@x.com", "admin")).toBe("editor");
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

  it("only super admin assigns roles; cannot demote another super admin", () => {
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
    ).toBe(false);
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
