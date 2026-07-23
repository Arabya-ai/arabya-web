import Link from "next/link";
import type { ReactNode } from "react";
import type { UserRole } from "@/lib/roles";
import { roleLabelAr } from "@/lib/roles";
import { dashNavForRole, type DashNavItem } from "@/lib/dashboard-nav";

type DashboardShellProps = {
  area: "account" | "studio" | "admin";
  role: UserRole;
  title: string;
  kicker: string;
  children: ReactNode;
  userName?: string | null;
  userImage?: string | null;
};

export function DashboardShell({
  area,
  role,
  title,
  kicker,
  children,
  userName,
  userImage,
}: DashboardShellProps) {
  const nav: DashNavItem[] = dashNavForRole(role, area);

  return (
    <div className="dash-shell shell page-block">
      <aside className="dash-sidebar" aria-label="تنقل اللوحة">
        <div className="dash-sidebar-brand">
          <p className="dash-kicker">{kicker}</p>
          <p className="dash-role">{roleLabelAr(role)}</p>
        </div>
        {userName ? (
          <div className="dash-user-chip">
            {userImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userImage} alt="" width={36} height={36} />
            ) : (
              <span className="dash-user-fallback" aria-hidden>
                {userName.slice(0, 1)}
              </span>
            )}
            <span className="dash-user-name">{userName}</span>
          </div>
        ) : null}
        <nav className="dash-nav">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="dash-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <Link href="/" className="dash-nav-link dash-nav-link--muted">
          العودة للموقع
        </Link>
      </aside>

      <div className="dash-main">
        <header className="dash-header">
          <h1>{title}</h1>
        </header>
        <div className="dash-content">{children}</div>
      </div>
    </div>
  );
}
