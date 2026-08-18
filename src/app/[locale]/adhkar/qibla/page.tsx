import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { AdhkarLocalNav } from "@/components/AdhkarLocalNav";
import { QiblaCompass } from "@/components/QiblaCompass";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  return {
    title: t("qiblaMetaTitle"),
    description: t("qiblaMetaDescription"),
  };
}

export default async function QiblaPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Adhkar" });

  return (
    <div className="shell page-block adhkar-page">
      <AdhkarLocalNav locale={locale} current="qibla" />
      <header className="asma-page-head">
        <h1>{t("tools.qibla")}</h1>
        <p>{t("qiblaLead")}</p>
      </header>
      <QiblaCompass />
    </div>
  );
}
