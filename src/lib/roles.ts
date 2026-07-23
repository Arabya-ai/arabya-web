export type UserRole = "user" | "editor" | "admin";

export function parseAdminEmails(raw: string | undefined): string[] {
  return (raw || "")
    .split(/[,;\s]+/)
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveRoleFromEmail(
  email: string | null | undefined,
  adminEmails = parseAdminEmails(process.env.ARABYA_ADMIN_EMAILS),
): UserRole {
  if (!email) return "user";
  if (adminEmails.includes(email.toLowerCase())) return "admin";
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
