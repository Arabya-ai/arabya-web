import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { getHisnCategories } from "@/lib/adhkar";
import { AdhkarLocalNav } from "@/components/AdhkarLocalNav";
import { HisnExplorer } from "@/components/HisnExplorer";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  return {
    title: t("hisnMetaTitle"),
    description: t("hisnMetaDescription"),
  };
}

export default async function HisnPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  const categories = await getHisnCategories();

  return (
    <div className="shell page-block adhkar-page">
      <AdhkarLocalNav locale={locale} current="hisn" />

      <header className="asma-page-head">
        <h1>{t("tools.hisn")}</h1>
        <p>{t("tools.hisnDesc")}</p>
      </header>

      <HisnExplorer categories={categories} />
    </div>
  );
}
