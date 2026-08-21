"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  ARABYA_SERVICE_CATEGORIES,
  ARABYA_SERVICES,
  type ArabyaServiceCategory,
  type ArabyaServiceEntry,
} from "@/lib/arabya-services-catalog";
import { ServiceIcon3D } from "@/components/services/ServiceIcon3D";
import "@/components/services/services-hub.css";

type Variant = "page" | "mega";

function categoryLabelKey(cat: ArabyaServiceCategory) {
  return `cat_${cat}` as const;
}

function ServiceCard({
  service,
  variant,
  onNavigate,
}: {
  service: ArabyaServiceEntry;
  variant: Variant;
  onNavigate?: () => void;
}) {
  const t = useTranslations("ServicesHub");
  const title = t(`items.${service.id}.title`);
  const desc = t(`items.${service.id}.desc`);

  return (
    <Link
      href={service.href}
      className={`svc-card svc-card--${variant}`}
      onClick={onNavigate}
    >
      <ServiceIcon3D icon={service.icon} label={title} />
      <span className="svc-card__body">
        <span className="svc-card__title">{title}</span>
        <span className="svc-card__desc">{desc}</span>
      </span>
    </Link>
  );
}

export function ServicesGrid({
  variant = "page",
  onNavigate,
  grouped = true,
}: {
  variant?: Variant;
  onNavigate?: () => void;
  grouped?: boolean;
}) {
  const t = useTranslations("ServicesHub");

  if (!grouped) {
    return (
      <div className={`svc-grid svc-grid--${variant}`}>
        {ARABYA_SERVICES.map((s) => (
          <ServiceCard
            key={s.id}
            service={s}
            variant={variant}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={`svc-groups svc-groups--${variant}`}>
      {ARABYA_SERVICE_CATEGORIES.map((cat) => {
        const items = ARABYA_SERVICES.filter((s) => s.category === cat);
        if (!items.length) return null;
        return (
          <section key={cat} className="svc-group" aria-labelledby={`svc-cat-${cat}`}>
            <h2 id={`svc-cat-${cat}`} className="svc-group__title">
              {t(categoryLabelKey(cat))}
            </h2>
            <div className={`svc-grid svc-grid--${variant}`}>
              {items.map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  variant={variant}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export function ServicesMegaPanel({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations("ServicesHub");

  return (
    <div className="svc-mega" role="menu" aria-label={t("megaAria")}>
      <div className="svc-mega__head">
        <p className="svc-mega__lead">{t("megaLead")}</p>
        <Link href="/services" className="svc-mega__all" onClick={onNavigate}>
          {t("viewAll")}
        </Link>
      </div>
      <ServicesGrid variant="mega" onNavigate={onNavigate} grouped />
    </div>
  );
}
