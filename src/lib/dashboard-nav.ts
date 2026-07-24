import type { UserRole } from "@/lib/roles";
import { canAccessAdmin, canAccessStudio } from "@/lib/roles";
import type { DashIconName } from "@/components/dashboard/DashIcon";

export type DashNavItem = {
  href: string;
  label: string;
  icon: DashIconName;
};

export function userDashNav(): DashNavItem[] {
  return [
    { href: "/account", label: "نظرة عامة", icon: "home" },
    { href: "/favorites", label: "المفضّلات", icon: "favorites" },
    { href: "/account#role-request", label: "طلب محرر", icon: "upgrade" },
  ];
}

export function studioDashNav(): DashNavItem[] {
  return [
    { href: "/studio", label: "نظرة عامة", icon: "studio" },
    { href: "/studio/queue", label: "طابور الجودة", icon: "queue" },
    { href: "/studio/sources", label: "المصادر", icon: "sources" },
    { href: "/account", label: "حسابي", icon: "home" },
  ];
}

export function adminDashNav(): DashNavItem[] {
  return [
    { href: "/admin", label: "إحصائيات", icon: "stats" },
    { href: "/admin/users", label: "المستخدمون", icon: "users" },
    { href: "/admin/requests", label: "طلبات الترقية", icon: "requests" },
    { href: "/admin/audit", label: "سجل الأدوار", icon: "audit" },
    { href: "/admin/settings", label: "إعدادات", icon: "settings" },
    { href: "/studio", label: "الاستوديو", icon: "studio" },
    { href: "/account", label: "حسابي", icon: "home" },
  ];
}

export function dashNavForRole(
  role: UserRole,
  area: "account" | "studio" | "admin",
): DashNavItem[] {
  if (area === "admin" && canAccessAdmin(role)) return adminDashNav();
  if (area === "studio" && canAccessStudio(role)) return studioDashNav();
  return userDashNav();
}
