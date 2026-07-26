import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

const PDF_LINKS = [
  { key: "complex" as const, href: "https://qurancomplex.gov.sa/" },
  { key: "qurancom" as const, href: "https://quran.com" },
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
    <div className="shell page-block">
      <h1>{t("title")}</h1>

      <section className="resource-block">
        <h2>{t("createTitle")}</h2>
        <p>
          {t.rich("createLead", {
            create: (c) => <Link href="/studio">{c}</Link>,
          })}
        </p>
      </section>

      <section className="resource-block">
        <h2>{t("radioTitle")}</h2>
        <p>{t("radioLead")}</p>
        <p>
          <a
            href="https://stream.radiojar.com/8s5u5tpdtwzuv"
            target="_blank"
            rel="noreferrer"
            className="nav-pill"
          >
            {t("radioPlay")}
          </a>
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
        </ul>
      </section>

      <section className="resource-block">
        <h2>{t("qiraatTitle")}</h2>
        <p className="layer-soon">{t("qiraatSoon")}</p>
      </section>

      <p>
        <Link href="/">{t("backIndex")}</Link>
      </p>
    </div>
  );
}
