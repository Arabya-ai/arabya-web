import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import {
  ServiceIcon3D,
} from "@/components/services/ServiceIcon3D";
import type { ArabyaServiceIcon } from "@/lib/arabya-services-catalog";
import "@/components/services/services-hub.css";

export type HubNavPill = {
  href: string;
  label: string;
};

type ArabyaHubHeroProps = {
  title: string;
  lead?: ReactNode;
  kicker?: string;
  icon?: ArabyaServiceIcon;
  iconLabel?: string;
  nav?: HubNavPill[];
  actions?: ReactNode;
  children?: ReactNode;
};

/** Shared teal hub chrome matching `/services` (hero + optional 3D mark). */
export function ArabyaHubHero({
  title,
  lead,
  kicker,
  icon,
  iconLabel,
  nav,
  actions,
  children,
}: ArabyaHubHeroProps) {
  return (
    <header className="services-hub__hero arabya-hub-hero">
      {nav?.length ? (
        <nav className="arabya-hub-hero__nav" aria-label={title}>
          {nav.map((item) => (
            <Link key={item.href + item.label} href={item.href} className="hub-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
      <div className="arabya-hub-hero__row">
        {icon ? (
          <ServiceIcon3D icon={icon} label={iconLabel || title} />
        ) : null}
        <div className="arabya-hub-hero__copy">
          {kicker ? <p className="arabya-hub-hero__kicker">{kicker}</p> : null}
          <h1>{title}</h1>
          {lead ? <p>{lead}</p> : null}
          {actions ? (
            <div className="services-hub__hero-actions">{actions}</div>
          ) : null}
          {children}
        </div>
      </div>
    </header>
  );
}

type ArabyaHubPageProps = {
  children: ReactNode;
  className?: string;
};

export function ArabyaHubPage({ children, className = "" }: ArabyaHubPageProps) {
  return (
    <div className={`shell page-block services-hub arabya-hub-page ${className}`.trim()}>
      {children}
    </div>
  );
}
