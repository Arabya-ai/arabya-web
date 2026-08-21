import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { ServiceIcon3D } from "@/components/services/ServiceIcon3D";
import { ServicesGrid } from "@/components/services/ServicesGrid";
import type { ArabyaServiceIcon } from "@/lib/arabya-services-catalog";
import "@/components/services/services-hub.css";

type Props = { params: Promise<{ locale: string }> };

const PDF_LINKS = [
  { key: "complex" as const, href: "https://qurancomplex.gov.sa/", icon: "mushaf" as const },
  { key: "qurancom" as const, href: "https://quran.com", icon: "resources" as const },
];

const RESOURCE_CARDS: {
  id: string;
  href: string;
  icon: ArabyaServiceIcon;
  titleKey: "createTitle" | "libraryTitle" | "qiraatTitle" | "servicesHubCard";
  descKey: "createCardDesc" | "libraryLead" | "qiraatCardDesc" | "servicesHubCardDesc";
  external?: boolean;
}[] = [
  {
    id: "services",
    href: "/services",
    icon: "resources",
    titleKey: "servicesHubCard",
    descKey: "servicesHubCardDesc",
  },
  {
    id: "create",
    href: "/studio",
    icon: "studio",
    titleKey: "createTitle",
    descKey: "createCardDesc",
  },
  {
    id: "library",
    href: "/library",
    icon: "library",
    titleKey: "libraryTitle",
    descKey: "libraryLead",
  },
  {
    id: "qiraat",
    href: "/qiraat",
    icon: "qiraat",
    titleKey: "qiraatTitle",
    descKey: "qiraatCardDesc",
  },
];

const API_CARDS: {
  id: string;
  icon: ArabyaServiceIcon;
  titleKey: "apiPrayerTitle" | "apiAsmaTitle" | "apiAudioTitle" | "apiStudyTitle" | "apiHadithTitle";
  descKey: "apiPrayerDesc" | "apiAsmaDesc" | "apiAudioDesc" | "apiStudyDesc" | "apiHadithDesc";
  href?: string;
}[] = [
  {
    id: "prayer",
    icon: "qibla",
    titleKey: "apiPrayerTitle",
    descKey: "apiPrayerDesc",
    href: "/qibla",
  },
  {
    id: "asma",
    icon: "asma",
    titleKey: "apiAsmaTitle",
    descKey: "apiAsmaDesc",
    href: "/asma",
  },
  {
    id: "audio",
    icon: "reciters",
    titleKey: "apiAudioTitle",
    descKey: "apiAudioDesc",
    href: "/reciters",
  },
  {
    id: "study",
    icon: "study",
    titleKey: "apiStudyTitle",
    descKey: "apiStudyDesc",
    href: "/study",
  },
  {
    id: "hadith",
    icon: "hadith",
    titleKey: "apiHadithTitle",
    descKey: "apiHadithDesc",
    href: "/hadith",
  },
];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Resources" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ResourcesPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Resources" });

  return (
    <div className="shell page-block resources-hub">
      <nav className="surah-nav" aria-label={t("navAria")}>
        <Link href="/" className="nav-pill">
          {t("backIndex")}
        </Link>
        <Link href="/services" className="nav-pill">
          {t("toServicesHub")}
        </Link>
      </nav>

      <header className="resources-hub__hero">
        <h1>{t("title")}</h1>
        <p>{t("lead")}</p>
        <div className="resources-hub__hero-actions">
          <Link href="/services" className="nav-pill">
            {t("toServicesHub")}
          </Link>
        </div>
      </header>

      <section className="svc-group" aria-labelledby="res-hubs">
        <h2 id="res-hubs" className="svc-group__title">
          {t("hubsTitle")}
        </h2>
        <div className="svc-grid svc-grid--resources">
          {RESOURCE_CARDS.map((card) => (
            <Link key={card.id} href={card.href} className="svc-card">
              <ServiceIcon3D icon={card.icon} label={t(card.titleKey)} />
              <span className="svc-card__body">
                <span className="svc-card__title">{t(card.titleKey)}</span>
                <span className="svc-card__desc">{t(card.descKey)}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="svc-group" aria-labelledby="res-services">
        <h2 id="res-services" className="svc-group__title">
          {t("servicesTitle")}
        </h2>
        <p className="layer-hint" style={{ marginTop: 0 }}>
          {t("servicesLead")}
        </p>
        <ServicesGrid variant="page" grouped={false} />
      </section>

      <section className="svc-group" aria-labelledby="res-pdf">
        <h2 id="res-pdf" className="svc-group__title">
          {t("pdfTitle")}
        </h2>
        <p className="layer-hint" style={{ marginTop: 0 }}>
          {t("pdfLead")}
        </p>
        <div className="svc-grid svc-grid--resources">
          {PDF_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              target="_blank"
              rel="noreferrer"
              className="svc-card"
            >
              <ServiceIcon3D icon={l.icon} label={t(`pdfLinks.${l.key}`)} />
              <span className="svc-card__body">
                <span className="svc-card__title">{t(`pdfLinks.${l.key}`)}</span>
                <span className="svc-card__desc">{t("pdfExternal")}</span>
                <span className="svc-card__meta">{t("openExternal")}</span>
              </span>
            </a>
          ))}
        </div>
      </section>

      <section className="svc-group" aria-labelledby="res-api">
        <h2 id="res-api" className="svc-group__title">
          {t("apiTitle")}
        </h2>
        <div className="svc-grid svc-grid--resources">
          {API_CARDS.map((card) => {
            const body = (
              <>
                <ServiceIcon3D icon={card.icon} label={t(card.titleKey)} />
                <span className="svc-card__body">
                  <span className="svc-card__title">{t(card.titleKey)}</span>
                  <span className="svc-card__desc">{t(card.descKey)}</span>
                </span>
              </>
            );
            return card.href ? (
              <Link key={card.id} href={card.href} className="svc-card">
                {body}
              </Link>
            ) : (
              <div key={card.id} className="svc-card">
                {body}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
