"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { UserRole } from "@/lib/roles";
import { roleLabelAr } from "@/lib/roles";
import { unifiedDashNav } from "@/lib/dashboard-nav";
import { DashIcon } from "@/components/dashboard/DashIcon";
import { DashBackButton } from "@/components/dashboard/DashBackButton";

type DashboardShellProps = {
  area: "account" | "studio" | "admin";
  role: UserRole;
  title: string;
  kicker: string;
  children: ReactNode;
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
};

export function DashboardShell({
  area,
  role,
  title,
  kicker,
  children,
  userName,
  userEmail,
  userImage,
  subtitle,
  backHref,
  backLabel,
}: DashboardShellProps) {
  const pathname = usePathname();
  const nav = unifiedDashNav(role, userEmail);
  const [navOpen, setNavOpen] = useState(true);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 960px)");
    const sync = () => {
      setIsCompact(mq.matches);
      if (!mq.matches) setNavOpen(true);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const groups = nav.reduce<Record<string, typeof nav>>((acc, item) => {
    const g = item.group || "عام";
    (acc[g] ||= []).push(item);
    return acc;
  }, {});

  const showNav = !isCompact || navOpen;

  return (
    <div className={`dash-shell shell page-block dash-shell--${area}`}>
      <div className="dash-orb dash-orb--a" aria-hidden />
      <div className="dash-orb dash-orb--b" aria-hidden />

      <aside className="dash-sidebar" aria-label="تنقل اللوحة">
        <div className="dash-user-chip dash-user-chip--primary">
          {userImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userImage} alt="" width={48} height={48} />
          ) : (
            <span className="dash-user-fallback" aria-hidden>
              {(userName || userEmail || "?").slice(0, 1)}
            </span>
          )}
          <div className="dash-user-meta">
            <span className="dash-user-name">{userName || "مستخدم عربية"}</span>
            <span className="dash-role">
              <DashIcon
                name={
                  role === "admin" ? "shield" : role === "editor" ? "studio" : "spark"
                }
              />
              {roleLabelAr(role)}
            </span>
            {userEmail ? (
              <span className="dash-user-area" dir="ltr">
                {userEmail}
              </span>
            ) : (
              <span className="dash-user-area">{kicker}</span>
            )}
          </div>
        </div>

        {isCompact ? (
          <button
            type="button"
            className="dash-nav-toggle"
            aria-expanded={navOpen}
            aria-controls="dash-panel-nav"
            onClick={() => setNavOpen((v) => !v)}
          >
            <DashIcon name="home" />
            <span>{navOpen ? "إخفاء قائمة اللوحة" : "قائمة اللوحة"}</span>
            <span className="dash-nav-toggle-count">{nav.length}</span>
          </button>
        ) : null}

        {showNav ? (
          <>
            <nav id="dash-panel-nav" className="dash-nav">
              {Object.entries(groups).map(([group, items]) => (
                <div key={group} className="dash-nav-group">
                  <p className="dash-nav-group-label">{group}</p>
                  {items.map((item) => {
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
                        onClick={() => {
                          if (isCompact) setNavOpen(false);
                        }}
                      >
                        <span className="dash-nav-icon">
                          <DashIcon name={item.icon} />
                        </span>
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            <Link
              href="/"
              className="dash-nav-link dash-nav-link--muted"
              onClick={() => {
                if (isCompact) setNavOpen(false);
              }}
            >
              <span className="dash-nav-icon">
                <DashIcon name="back" />
              </span>
              <span>العودة للموقع</span>
            </Link>
          </>
        ) : null}
      </aside>

      <div className="dash-main">
        <header className="dash-header">
          <div>
            {backHref ? (
              <DashBackButton href={backHref} label={backLabel || "رجوع"} />
            ) : null}
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
