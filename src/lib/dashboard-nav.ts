import type { UserRole } from "@/lib/roles";
import { canAccessAdmin, canAccessStudio } from "@/lib/roles";

export type DashNavItem = {
  href: string;
  label: string;
};

export function userDashNav(): DashNavItem[] {
  return [
    { href: "/account", label: "نظرة عامة" },
    { href: "/favorites", label: "المفضّلات" },
    { href: "/account#role-request", label: "طلب محرر" },
  ];
}

export function studioDashNav(): DashNavItem[] {
  return [
    { href: "/studio", label: "نظرة عامة" },
    { href: "/studio/queue", label: "طابور الجودة" },
    { href: "/studio/sources", label: "المصادر" },
    { href: "/account", label: "حسابي" },
  ];
}

export function adminDashNav(): DashNavItem[] {
  return [
    { href: "/admin", label: "إحصائيات" },
    { href: "/admin/users", label: "المستخدمون" },
    { href: "/admin/requests", label: "طلبات الترقية" },
    { href: "/admin/audit", label: "سجل الأدوار" },
    { href: "/admin/settings", label: "إعدادات" },
    { href: "/studio", label: "الاستوديو" },
    { href: "/account", label: "حسابي" },
  ];
}

export function dashNavForRole(role: UserRole, area: "account" | "studio" | "admin"): DashNavItem[] {
  if (area === "admin" && canAccessAdmin(role)) return adminDashNav();
  if (area === "studio" && canAccessStudio(role)) return studioDashNav();
  return userDashNav();
}
