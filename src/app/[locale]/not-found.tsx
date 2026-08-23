import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ServicesGrid } from "@/components/services/ServicesGrid";
import "@/components/services/services-hub.css";

export default async function NotFound() {
  const t = await getTranslations("Errors");

  return (
    <div className="shell page-block not-found-page services-hub">
      <header className="not-found-hero services-hub__hero">
        <div className="not-found-hero__brand">
          <picture>
            <source srcSet="/brand/arabya-mark-ui.webp" type="image/webp" />
            <img
              src="/brand/arabya-mark-ui.png"
              alt=""
              width={56}
              height={56}
              className="not-found-hero__mark"
              decoding="async"
              fetchPriority="high"
            />
          </picture>
          <p className="not-found-hero__wordmark">{t("brandName")}</p>
        </div>
        <p className="not-found-hero__code" aria-hidden>
          404
        </p>
        <h1>{t("notFoundTitle")}</h1>
        <p>{t("notFoundMessage")}</p>
        <div className="services-hub__hero-actions not-found-hero__actions">
          <Link href="/" className="not-found-cta not-found-cta--primary">
            {t("backHome")}
          </Link>
          <Link href="/services" className="not-found-cta not-found-cta--ghost">
            {t("browseServices")}
          </Link>
          <Link href="/mushaf/1" className="nav-pill">
            {t("openMushaf")}
          </Link>
        </div>
      </header>

      <section className="not-found-services" aria-labelledby="not-found-services-title">
        <div className="not-found-services__head">
          <h2 id="not-found-services-title">{t("servicesHeading")}</h2>
          <p>{t("servicesLead")}</p>
        </div>
        <ServicesGrid variant="page" grouped />
      </section>
    </div>
  );
}
