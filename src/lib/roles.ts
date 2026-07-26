export type UserRole = "member" | "creator" | "editor" | "admin";

/** Legacy DB value still accepted on read. */
export type LegacyUserRole = UserRole | "user";

/** سوبر أدمن فقط — الموافقة على ترقية مدير */
export const SUPER_ADMIN_EMAILS = [
  "egywebdev@gmail.com",
  "arabyaaicom@gmail.com",
] as const;

export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return (SUPER_ADMIN_EMAILS as readonly string[]).includes(
    email.trim().toLowerCase(),
  );
}

export function isEnvAdminEmail(
  email: string | null | undefined,
  adminEmails = parseAdminEmails(process.env.ARABYA_ADMIN_EMAILS),
): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (isSuperAdminEmail(lower)) return true;
  return adminEmails.includes(lower);
}

/**
 * Fallback when D1 is unavailable: env/super admins → admin, else member.
 * Creator/editor are never assigned here — only via admin approval in D1.
 */
export function resolveRoleFromEmail(
  email: string | null | undefined,
  adminEmails = parseAdminEmails(process.env.ARABYA_ADMIN_EMAILS),
): UserRole {
  if (!email) return "member";
  if (isEnvAdminEmail(email, adminEmails)) return "admin";
  return "member";
}

/** Merge D1 role with immutable env-admin override. */
export function mergeRoleWithEnvAdmin(
  email: string | null | undefined,
  cloudRole: UserRole | LegacyUserRole | null | undefined,
  adminEmails = parseAdminEmails(process.env.ARABYA_ADMIN_EMAILS),
): UserRole {
  if (isEnvAdminEmail(email, adminEmails)) return "admin";
  return normalizeUserRole(cloudRole);
}

export type AppLocale = "ar" | "en";

const ROLE_LABELS: Record<AppLocale, Record<UserRole, string>> = {
  ar: {
    admin: "مدير",
    editor: "محرر",
    creator: "مؤلف",
    member: "مسجل",
  },
  en: {
    admin: "Admin",
    editor: "Editor",
    creator: "Creator",
    member: "Member",
  },
};

export function roleLabel(role: UserRole, locale: AppLocale = "ar"): string {
  return ROLE_LABELS[locale][role] ?? ROLE_LABELS[locale].member;
}

/** All signed-in roles may use Studio; brand rules differ by role. */
export function canAccessStudio(role: UserRole): boolean {
  return (
    role === "member" ||
    role === "creator" ||
    role === "editor" ||
    role === "admin"
  );
}

export function canAccessAdmin(role: UserRole): boolean {
  return role === "admin";
}

/**
 * Export without Arabya brand lockup / watermark.
 * Super admin, admin, editor, creator — yes. Member — no.
 */
export function canExportStudioWithoutBrand(
  role: UserRole | null | undefined,
  email?: string | null,
): boolean {
  if (isSuperAdminEmail(email)) return true;
  return role === "admin" || role === "editor" || role === "creator";
}

/** ترقية إلى مدير — موافقة السوبر أدمن فقط */
export function canApproveAdminRole(email: string | null | undefined): boolean {
  return isSuperAdminEmail(email);
}

export function normalizeUserRole(value: unknown): UserRole {
  if (value === "admin" || value === "editor" || value === "creator") {
    return value;
  }
  // Legacy "user" → member
  if (value === "member" || value === "user") return "member";
  return "member";
}

/** Roles an admin may assign (admin requires super-admin actor). */
export const ASSIGNABLE_ROLES: UserRole[] = [
  "member",
  "creator",
  "editor",
  "admin",
];
