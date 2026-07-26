import { describe, expect, it } from "vitest";
import {
  canAccessAdmin,
  canAccessEditorialTools,
  canAccessStudio,
  canApproveAdminRole,
  canAssignRole,
  canExportStudioWithoutBrand,
  canExportUnlimitedStudioAyahs,
  dailyVideoExportLimit,
  isSuperAdminEmail,
  mergeRoleWithEnvAdmin,
  normalizeUserRole,
  parseAdminEmails,
  resolveRoleFromEmail,
  roleLabel,
  MEMBER_DAILY_VIDEO_EXPORT_LIMIT,
} from "@/lib/roles";

describe("parseAdminEmails", () => {
  it("splits emails by comma, semicolon, or whitespace", () => {
    expect(parseAdminEmails("a@x.com, b@y.com;c@z.com")).toEqual([
      "a@x.com",
      "b@y.com",
      "c@z.com",
    ]);
  });
});

describe("resolveRoleFromEmail", () => {
  it("only super-admin emails become admin", () => {
    expect(resolveRoleFromEmail("egywebdev@gmail.com")).toBe("admin");
    expect(resolveRoleFromEmail("reader@gmail.com", ["reader@gmail.com"])).toBe(
      "member",
    );
  });
});

describe("mergeRoleWithEnvAdmin", () => {
  it("forces super-admin email to admin", () => {
    expect(mergeRoleWithEnvAdmin("egywebdev@gmail.com", "member")).toBe(
      "admin",
    );
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
    expect(canApproveAdminRole("egywebdev@gmail.com")).toBe(true);
    expect(canApproveAdminRole("editor@gmail.com")).toBe(false);
    expect(canAssignRole("editor@x.com", "member")).toBe(false);
    expect(
      canAssignRole("egywebdev@gmail.com", "creator", {
        targetEmail: "a@b.com",
      }),
    ).toBe(true);
    expect(
      canAssignRole("egywebdev@gmail.com", "member", {
        targetEmail: "arabyaaicom@gmail.com",
      }),
    ).toBe(false);
    expect(
      canAssignRole("egywebdev@gmail.com", "editor", {
        targetEmail: "egywebdev@gmail.com",
        actorEmail: "egywebdev@gmail.com",
      }),
    ).toBe(false);
    expect(
      canAssignRole("egywebdev@gmail.com", "admin", {
        targetEmail: "random@x.com",
      }),
    ).toBe(false);
    expect(
      canAssignRole("egywebdev@gmail.com", "admin", {
        targetEmail: "arabyaaicom@gmail.com",
      }),
    ).toBe(true);
  });

  it("normalizes roles", () => {
    expect(normalizeUserRole("user")).toBe("member");
    expect(isSuperAdminEmail("arabyaaicom@gmail.com")).toBe(true);
  });
});
