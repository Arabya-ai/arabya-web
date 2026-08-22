"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ServicesGrid } from "@/components/services/ServicesGrid";
import { ServiceIcon3D } from "@/components/services/ServiceIcon3D";
import "@/components/services/services-hub.css";

/** Homepage block under Asma — featured Lughawi + Studio, then full services grid. */
export function HomeServicesSection() {
  const t = useTranslations("HomeServices");
  const ts = useTranslations("ServicesHub");

  return (
    <section
      className="home-services shell page-block services-hub"
      aria-labelledby="home-services-title"
    >
      <header className="services-hub__hero home-services__hero">
        <p className="arabya-hub-hero__kicker">{t("kicker")}</p>
        <h2 id="home-services-title">{t("title")}</h2>
        <p>{t("lead")}</p>
        <div className="services-hub__hero-actions">
          <Link href="/services" className="not-found-cta not-found-cta--ghost">
            {t("viewAll")}
          </Link>
        </div>
      </header>

      <div className="home-services__featured" aria-label={t("featuredAria")}>
        <Link href="/lughawi" className="svc-card svc-card--page home-services__feature home-services__feature--pulse">
          <ServiceIcon3D icon="lughawi" label={ts("items.lughawi.title")} />
          <span className="svc-card__body">
            <span className="home-services__badge">{t("favoriteBadge")}</span>
            <span className="svc-card__title">{ts("items.lughawi.title")}</span>
            <span className="svc-card__desc">{ts("items.lughawi.desc")}</span>
          </span>
        </Link>
        <Link href="/studio" className="svc-card svc-card--page home-services__feature home-services__feature--pulse">
          <ServiceIcon3D icon="studio" label={ts("items.studio.title")} />
          <span className="svc-card__body">
            <span className="home-services__badge">{t("favoriteBadge")}</span>
            <span className="svc-card__title">{ts("items.studio.title")}</span>
            <span className="svc-card__desc">{ts("items.studio.desc")}</span>
          </span>
        </Link>
      </div>

      <div className="home-services__grid-wrap">
        <h3 className="svc-group__title">{t("allHeading")}</h3>
        <ServicesGrid variant="page" grouped />
      </div>
    </section>
  );
}
