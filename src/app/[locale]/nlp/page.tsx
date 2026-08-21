import "@/components/services/services-hub.css";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { NlpToolkit } from "@/components/nlp/NlpToolkit";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "NlpService" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function NlpPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "NlpService" });

  return (
    <div className="shell page-block nlp-svc-page">
      <nav className="surah-nav" aria-label={t("navAria")}>
        <Link href="/services" className="nav-pill">
          {t("backServices")}
        </Link>
        <Link href="/lughawi" className="nav-pill">
          {t("toLughawi")}
        </Link>
      </nav>

      <header className="services-hub__hero">
        <h1>{t("title")}</h1>
        <p>{t("lead")}</p>
      </header>

      <NlpToolkit />
    </div>
  );
}
