import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { getTasbeehPhrases } from "@/lib/adhkar";
import { AdhkarLocalNav } from "@/components/AdhkarLocalNav";
import { TasbeehCounter } from "@/components/TasbeehCounter";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  return {
    title: t("tasbeehMetaTitle"),
    description: t("tasbeehMetaDescription"),
  };
}

export default async function TasbeehPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  const phrases = await getTasbeehPhrases();

  return (
    <div className="shell page-block adhkar-page">
      <AdhkarLocalNav locale={locale} current="tasbeeh" />

      <header className="asma-page-head">
        <h1>{t("tools.tasbeeh")}</h1>
        <p>{t("tools.tasbeehDesc")}</p>
      </header>

      <TasbeehCounter phrases={phrases} />
    </div>
  );
}
