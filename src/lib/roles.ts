export type UserRole = "member" | "creator" | "editor" | "admin";

/** Legacy DB value still accepted on read. */
export type LegacyUserRole = UserRole | "user";

export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Super-admin allowlist from Contabo `.env` only (`ARABYA_ADMIN_EMAILS`).
 * Production is fail-closed: empty env → no email is treated as super-admin.
 * Hardcoded identities were removed from source (audit H-05).
 */
export function getSuperAdminEmails(): string[] {
  return parseAdminEmails(process.env.ARABYA_ADMIN_EMAILS);
}

/** Safe diagnostics for admin settings — no raw emails in output. */
export function getSuperAdminEnvDiagnostics(
  sessionEmail?: string | null,
): {
  configured: boolean;
  configuredCount: number;
  currentEmailInList: boolean;
} {
  const emails = getSuperAdminEmails();
  const normalized = sessionEmail?.trim().toLowerCase() || "";
  return {
    configured: emails.length > 0,
    configuredCount: emails.length,
    currentEmailInList: normalized ? emails.includes(normalized) : false,
  };
}

/**
 * @deprecated Always empty — use `getSuperAdminEmails()` / `ARABYA_ADMIN_EMAILS`.
 * Kept so older imports do not crash; do not put real emails here.
 */
export const SUPER_ADMIN_EMAILS: readonly string[] = [];

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return false;
  return getSuperAdminEmails().includes(normalized);
}

/** @deprecated Prefer isSuperAdminEmail — admin rank is super-admin only. */
export function isEnvAdminEmail(
  email: string | null | undefined,
): boolean {
  return isSuperAdminEmail(email);
}

/**
 * Fallback when D1 is unavailable: super admins → admin, else member.
 * Creator/editor never assigned from email alone.
 */
export function resolveRoleFromEmail(
  email: string | null | undefined,
): UserRole {
  if (!email) return "member";
  if (isSuperAdminEmail(email)) return "admin";
  return "member";
}

/**
 * Merge D1 role with immutable super-admin override.
 * Non–super-admin emails never keep `admin` (demoted to editor).
 */
export function mergeRoleWithEnvAdmin(
  email: string | null | undefined,
  cloudRole: UserRole | LegacyUserRole | null | undefined,
): UserRole {
  if (isSuperAdminEmail(email)) return "admin";
  const role = normalizeUserRole(cloudRole);
  if (role === "admin") return "editor";
  return role;
}

export type AppLocale = "ar" | "en";

const ROLE_LABELS: Record<AppLocale, Record<UserRole, string>> = {
  ar: {
    admin: "سوبر أدمن",
    editor: "محرر",
    creator: "مؤلف",
    member: "مسجل",
  },
  en: {
    admin: "Super Admin",
    editor: "Editor",
    creator: "Creator",
    member: "Member",
  },
};

const ROLE_TIER_LABELS: Record<AppLocale, Record<UserRole, string>> = {
  ar: {
    admin: "سوبر أدمن",
    editor: "بلس",
    creator: "برو",
    member: "مجاني",
  },
  en: {
    admin: "Super Admin",
    editor: "Plus",
    creator: "Pro",
    member: "Free",
  },
};

export function roleLabel(role: UserRole, locale: AppLocale = "ar"): string {
  return ROLE_LABELS[locale][role] ?? ROLE_LABELS[locale].member;
}

export function roleTierLabel(role: UserRole, locale: AppLocale = "ar"): string {
  return ROLE_TIER_LABELS[locale][role] ?? ROLE_TIER_LABELS[locale].member;
}

/**
 * Arabya Studio app (/studio) — all signed-in roles.
 * Brand / quota / ayah rules differ by role.
 */
export function canAccessStudio(role: UserRole): boolean {
  return (
    role === "member" ||
    role === "creator" ||
    role === "editor" ||
    role === "admin"
  );
}

/**
 * Site editorial tools (account/edit, sources, quality queue).
 * Editor (Plus) + Super Admin only — Creator (Pro) cannot access.
 */
export function canAccessEditorialTools(role: UserRole): boolean {
  return role === "editor" || role === "admin";
}

/** Admin dashboard — super admin (role admin) only. */
export function canAccessAdmin(role: UserRole): boolean {
  return role === "admin";
}

/**
 * Export without Arabya brand lockup.
 * Super admin / editor (Plus) / creator (Pro) — yes. Member (Free) — no.
 */
export function canExportStudioWithoutBrand(
  role: UserRole | null | undefined,
  email?: string | null,
): boolean {
  if (isSuperAdminEmail(email)) return true;
  return role === "admin" || role === "editor" || role === "creator";
}

/** Unlimited ayah span on Studio export. */
export function canExportUnlimitedStudioAyahs(
  role: UserRole | null | undefined,
  email?: string | null,
): boolean {
  if (isSuperAdminEmail(email)) return true;
  return role === "admin" || role === "editor" || role === "creator";
}

/**
 * Daily successful MP4 export cap.
 * Member = 5; creator/editor/admin = unlimited (null).
 */
export const MEMBER_DAILY_VIDEO_EXPORT_LIMIT = 5;

export function dailyVideoExportLimit(
  role: UserRole | null | undefined,
  email?: string | null,
): number | null {
  if (isSuperAdminEmail(email)) return null;
  if (role === "admin" || role === "editor" || role === "creator") return null;
  return MEMBER_DAILY_VIDEO_EXPORT_LIMIT;
}

/** ترقية/تعيين رتبة سوبر أدمن — السوبر أدمن فقط */
export function canApproveAdminRole(email: string | null | undefined): boolean {
  return isSuperAdminEmail(email);
}

/**
 * Who may change another user's role — super admin only.
 * Cannot demote another super-admin email, or demote self away from admin.
 */
export function canAssignRole(
  actorEmail: string | null | undefined,
  targetRole: UserRole,
  opts?: {
    targetCurrentRole?: UserRole | null;
    targetEmail?: string | null;
    actorEmail?: string | null;
  },
): boolean {
  if (!isSuperAdminEmail(actorEmail)) return false;

  const targetEmail = opts?.targetEmail?.trim().toLowerCase() || "";
  const actor = (actorEmail || opts?.actorEmail || "").trim().toLowerCase();

  // admin rank is immutable super-admin only — never assign to other emails
  if (targetRole === "admin" && !isSuperAdminEmail(targetEmail)) {
    return false;
  }
  if (targetEmail && isSuperAdminEmail(targetEmail) && targetRole !== "admin") {
    return false;
  }
  if (actor && targetEmail === actor && targetRole !== "admin") {
    return false;
  }
  return true;
}

export function normalizeUserRole(value: unknown): UserRole {
  if (value === "admin" || value === "editor" || value === "creator") {
    return value;
  }
  if (value === "member" || value === "user") return "member";
  return "member";
}

/** Roles super admin may assign in the UI. */
export const ASSIGNABLE_ROLES: UserRole[] = [
  "member",
  "creator",
  "editor",
  "admin",
];
