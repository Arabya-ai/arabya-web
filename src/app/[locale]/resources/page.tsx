import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

const PDF_LINKS = [
  { key: "complex" as const, href: "https://qurancomplex.gov.sa/" },
  { key: "qurancom" as const, href: "https://quran.com" },
];

const SERVICE_LINKS = [
  { href: "/mushaf/1", key: "svcMushaf" as const },
  { href: "/hadith", key: "svcHadith" as const },
  { href: "/heritage", key: "svcHeritage" as const },
  { href: "/adhkar", key: "svcAdhkar" as const },
  { href: "/qibla", key: "svcQibla" as const },
  { href: "/asma", key: "svcAsma" as const },
  { href: "/qiraat", key: "svcQiraat" as const },
  { href: "/library", key: "svcLibrary" as const },
  { href: "/books", key: "svcBooks" as const },
  { href: "/study", key: "svcStudy" as const },
  { href: "/studio", key: "svcStudio" as const },
  { href: "/roots", key: "svcRoots" as const },
] as const;

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
    <div className="shell page-block">
      <h1>{t("title")}</h1>
      <p className="layer-hint">{t("lead")}</p>
      <p>
        <Link href="/services" className="nav-pill">
          {t("toServicesHub")}
        </Link>
      </p>

      <section className="resource-block">
        <h2>{t("servicesTitle")}</h2>
        <p>{t("servicesLead")}</p>
        <ul className="resources-service-list">
          {SERVICE_LINKS.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="nav-pill">
                {t(s.key)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="resource-block">
        <h2>{t("createTitle")}</h2>
        <p>
          {t.rich("createLead", {
            create: (c) => <Link href="/create">{c}</Link>,
            studio: (c) => <Link href="/studio">{c}</Link>,
          })}
        </p>
      </section>

      <section className="resource-block">
        <h2>{t("libraryTitle")}</h2>
        <p>{t("libraryLead")}</p>
        <p>
          <Link href="/library" className="nav-pill">
            {t("libraryOpen")}
          </Link>
        </p>
      </section>

      <section className="resource-block">
        <h2>{t("pdfTitle")}</h2>
        <p>{t("pdfLead")}</p>
        <ul>
          {PDF_LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} target="_blank" rel="noreferrer">
                {t(`pdfLinks.${l.key}`)}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="resource-block">
        <h2>{t("apiTitle")}</h2>
        <ul>
          <li>{t.rich("apiPrayer", { code: (c) => <code>{c}</code> })}</li>
          <li>
            {t.rich("apiAsma", {
              code: (c) => <code>{c}</code>,
              link: (c) => <Link href="/asma">{c}</Link>,
            })}
          </li>
          <li>{t.rich("apiAudio", { code: (c) => <code>{c}</code> })}</li>
          <li>{t.rich("apiStudy", { code: (c) => <code>{c}</code> })}</li>
          <li>{t.rich("apiHadith", { code: (c) => <code>{c}</code> })}</li>
          <li>{t.rich("apiCoords", { code: (c) => <code>{c}</code> })}</li>
        </ul>
      </section>

      <section className="resource-block">
        <h2>{t("qiraatTitle")}</h2>
        <p>
          {t.rich("qiraatLead", {
            qiraat: (c) => <Link href="/qiraat">{c}</Link>,
          })}
        </p>
      </section>

      <p>
        <Link href="/">{t("backIndex")}</Link>
      </p>
    </div>
  );
}
