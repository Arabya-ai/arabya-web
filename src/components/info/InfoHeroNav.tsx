"use client";

import { Link, usePathname } from "@/i18n/navigation";

export type InfoHeroNavItem = {
  href: string;
  label: string;
  primary?: boolean;
  /** When set, mark active for any pathname starting with this prefix. */
  matchPrefix?: string;
};

function isCurrent(
  pathname: string,
  href: string,
  matchPrefix?: string,
): boolean {
  if (matchPrefix) {
    return pathname === matchPrefix || pathname.startsWith(`${matchPrefix}/`);
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function InfoHeroNav({ items }: { items: InfoHeroNavItem[] }) {
  const pathname = usePathname();

  return (
    <div className="info-hero-actions" role="navigation" aria-label="Info">
      {items.map(({ href, label, primary, matchPrefix }) => {
        const current = isCurrent(pathname, href, matchPrefix);
        const className = [
          "info-btn",
          primary ? "info-btn--primary" : "info-btn--ghost",
          current ? "info-btn--current" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <Link
            key={href}
            href={href}
            className={className}
            aria-current={current ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
