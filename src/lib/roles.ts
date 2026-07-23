export type UserRole = "user" | "editor" | "admin";

export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isEnvAdminEmail(
  email: string | null | undefined,
  adminEmails = parseAdminEmails(process.env.ARABYA_ADMIN_EMAILS),
): boolean {
  if (!email) return false;
  return adminEmails.includes(email.toLowerCase());
}

/**
 * Fallback when D1 is unavailable: env admins → admin, else user.
 * Editor is never assigned here — only via admin approval in D1.
 */
export function resolveRoleFromEmail(
  email: string | null | undefined,
  adminEmails = parseAdminEmails(process.env.ARABYA_ADMIN_EMAILS),
): UserRole {
  if (!email) return "user";
  if (adminEmails.includes(email.toLowerCase())) return "admin";
  return "user";
}

/** Merge D1 role with immutable env-admin override. */
export function mergeRoleWithEnvAdmin(
  email: string | null | undefined,
  cloudRole: UserRole | null | undefined,
  adminEmails = parseAdminEmails(process.env.ARABYA_ADMIN_EMAILS),
): UserRole {
  if (isEnvAdminEmail(email, adminEmails)) return "admin";
  if (cloudRole === "admin" || cloudRole === "editor" || cloudRole === "user") {
    return cloudRole;
  }
  return "user";
}

export function roleLabelAr(role: UserRole): string {
  switch (role) {
    case "admin":
      return "مدير";
    case "editor":
      return "محرر";
    default:
      return "مشترك";
  }
}

export function canAccessStudio(role: UserRole): boolean {
  return role === "editor" || role === "admin";
}

export function canAccessAdmin(role: UserRole): boolean {
  return role === "admin";
}

export function normalizeUserRole(value: unknown): UserRole {
  if (value === "admin" || value === "editor" || value === "user") return value;
  return "user";
}
