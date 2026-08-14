import type { UserRole } from "@/lib/roles";
import {
  canAccessAdmin,
  canAccessEditorialTools,
} from "@/lib/roles";
import type { DashIconName } from "@/components/dashboard/DashIcon";

export type DashNavItem = {
  href: string;
  label: string;
  icon: DashIconName;
  group?: string;
};

/** Unified nav by role — shown in account, studio, and admin shells. */
export function unifiedDashNav(role: UserRole): DashNavItem[] {
  const items: DashNavItem[] = [
    { href: "/account", label: "overview", icon: "home", group: "groupAccount" },
    {
      href: "/account/stats",
      label: "stats",
      icon: "stats",
      group: "groupAccount",
    },
    {
      href: "/favorites",
      label: "favorites",
      icon: "favorites",
      group: "groupAccount",
    },
    { href: "/account/study", label: "study", icon: "book", group: "groupAccount" },
    { href: "/tahfeez", label: "tahfeez", icon: "spark", group: "groupAccount" },
    { href: "/account/tahfeez", label: "tahfeezPortfolio", icon: "stats", group: "groupAccount" },
    { href: "/studio", label: "studio", icon: "spark", group: "groupAccount" },
    {
      href: "/account#role-request",
      label: "upgrade",
      icon: "upgrade",
      group: "groupAccount",
    },
  ];

  if (canAccessEditorialTools(role)) {
    items.push(
      {
        href: "/account/edit",
        label: "edit",
        icon: "spark",
        group: "groupEdit",
      },
      {
        href: "/account/edit/queue",
        label: "queue",
        icon: "queue",
        group: "groupEdit",
      },
      {
        href: "/account/edit/sources",
        label: "sources",
        icon: "sources",
        group: "groupEdit",
      },
    );
  }

  if (canAccessAdmin(role)) {
    items.push(
      {
        href: "/admin",
        label: "adminStats",
        icon: "stats",
        group: "groupAdmin",
      },
      {
        href: "/admin/users",
        label: "users",
        icon: "users",
        group: "groupAdmin",
      },
      {
        href: "/admin/tahfeez",
        label: "tahfeezAdmin",
        icon: "book",
        group: "groupAdmin",
      },
      {
        href: "/admin/requests",
        label: "requests",
        icon: "requests",
        group: "groupAdmin",
      },
      {
        href: "/admin/audit",
        label: "audit",
        icon: "audit",
        group: "groupAdmin",
      },
      {
        href: "/admin/settings",
        label: "settings",
        icon: "settings",
        group: "groupAdmin",
      },
    );
  }

  return items;
}

/** @deprecated use unifiedDashNav */
export function dashNavForRole(
  role: UserRole,
  area?: "account" | "studio" | "admin",
  email?: string | null,
): DashNavItem[] {
  void area;
  void email;
  return unifiedDashNav(role);
}
