import type { UserRole } from "@/lib/roles";
import { canAccessAdmin, canAccessStudio } from "@/lib/roles";
import type { DashIconName } from "@/components/dashboard/DashIcon";

export type DashNavItem = {
  href: string;
  label: string;
  icon: DashIconName;
  group?: string;
};

/** قائمة موحّدة حسب الدور — تظهر كاملة في الحساب والاستوديو والإدارة. */
export function unifiedDashNav(
  role: UserRole,
  _email?: string | null,
): DashNavItem[] {
  const items: DashNavItem[] = [
    { href: "/account", label: "نظرة عامة", icon: "home", group: "حسابي" },
    {
      href: "/account/stats",
      label: "لوحة الإحصائيات",
      icon: "stats",
      group: "حسابي",
    },
    {
      href: "/favorites",
      label: "المفضّلات",
      icon: "favorites",
      group: "حسابي",
    },
    { href: "/account/study", label: "دراسة", icon: "book", group: "حسابي" },
    {
      href: "/account#role-request",
      label: "طلب ترقية",
      icon: "upgrade",
      group: "حسابي",
    },
  ];

  if (canAccessStudio(role)) {
    items.push(
      { href: "/studio", label: "الاستوديو", icon: "studio", group: "استوديو" },
      {
        href: "/studio/queue",
        label: "طابور الجودة",
        icon: "queue",
        group: "استوديو",
      },
      {
        href: "/studio/sources",
        label: "المصادر",
        icon: "sources",
        group: "استوديو",
      },
    );
  }

  if (canAccessAdmin(role)) {
    items.push(
      {
        href: "/admin",
        label: "إحصائيات المنصة",
        icon: "stats",
        group: "إدارة",
      },
      {
        href: "/admin/users",
        label: "المستخدمون",
        icon: "users",
        group: "إدارة",
      },
      {
        href: "/admin/requests",
        label: "طلبات الترقية",
        icon: "requests",
        group: "إدارة",
      },
      {
        href: "/admin/audit",
        label: "سجل الأدوار",
        icon: "audit",
        group: "إدارة",
      },
      {
        href: "/admin/settings",
        label: "إعدادات",
        icon: "settings",
        group: "إدارة",
      },
    );
  }

  return items;
}

/** @deprecated use unifiedDashNav */
export function dashNavForRole(
  role: UserRole,
  _area?: "account" | "studio" | "admin",
  email?: string | null,
): DashNavItem[] {
  return unifiedDashNav(role, email);
}
