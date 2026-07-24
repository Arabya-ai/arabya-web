"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import type { UserRole } from "@/lib/roles";
import { roleLabelAr } from "@/lib/roles";
import { dashNavForRole } from "@/lib/dashboard-nav";
import { DashIcon } from "@/components/dashboard/DashIcon";

type DashboardShellProps = {
  area: "account" | "studio" | "admin";
  role: UserRole;
  title: string;
  kicker: string;
  children: ReactNode;
  userName?: string | null;
  userImage?: string | null;
  subtitle?: string;
};

export function DashboardShell({
  area,
  role,
  title,
  kicker,
  children,
  userName,
  userImage,
  subtitle,
}: DashboardShellProps) {
  const pathname = usePathname();
  const nav = dashNavForRole(role, area);

  return (
    <div className={`dash-shell shell page-block dash-shell--${area}`}>
      <div className="dash-orb dash-orb--a" aria-hidden />
      <div className="dash-orb dash-orb--b" aria-hidden />

      <aside className="dash-sidebar" aria-label="تنقل اللوحة">
        <div className="dash-sidebar-top">
          <div className="dash-emblem-3d" aria-hidden>
            <span className="dash-emblem-face">ع</span>
          </div>
          <div className="dash-sidebar-brand">
            <p className="dash-kicker">{kicker}</p>
            <p className="dash-role">
              <DashIcon name={role === "admin" ? "shield" : role === "editor" ? "studio" : "spark"} />
              {roleLabelAr(role)}
            </p>
          </div>
        </div>

        {userName ? (
          <div className="dash-user-chip">
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userImage} alt="" width={40} height={40} />
            ) : (
              <span className="dash-user-fallback" aria-hidden>
                {userName.slice(0, 1)}
              </span>
            )}
            <div className="dash-user-meta">
              <span className="dash-user-name">{userName}</span>
              <span className="dash-user-area">{kicker}</span>
            </div>
          </div>
        ) : null}

        <nav className="dash-nav">
          {nav.map((item) => {
            const base = item.href.split("#")[0];
            const active =
              pathname === base ||
              (base !== "/account" &&
                base !== "/studio" &&
                base !== "/admin" &&
                pathname.startsWith(base));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`dash-nav-link${active ? " is-active" : ""}`}
              >
                <span className="dash-nav-icon">
                  <DashIcon name={item.icon} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <Link href="/" className="dash-nav-link dash-nav-link--muted">
          <span className="dash-nav-icon">
            <DashIcon name="back" />
          </span>
          <span>العودة للموقع</span>
        </Link>
      </aside>

      <div className="dash-main">
        <header className="dash-header">
          <div>
            <p className="dash-header-kicker">{kicker}</p>
            <h1>{title}</h1>
            {subtitle ? <p className="dash-header-sub">{subtitle}</p> : null}
          </div>
          <div className="dash-header-badge" aria-hidden>
            <DashIcon name="spark" />
          </div>
        </header>
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}
