import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { getTasbeehPhrases } from "@/lib/adhkar";
import { AdhkarLocalNav } from "@/components/AdhkarLocalNav";
import { TasbeehCounter } from "@/components/TasbeehCounter";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

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
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const phrases = await getTasbeehPhrases();

  return (
    <ArabyaHubPage className="adhkar-page">
      <AdhkarLocalNav locale={locale} current="tasbeeh" />
      <ArabyaHubHero
        icon="asma"
        iconLabel={t("tools.tasbeeh")}
        title={t("tools.tasbeeh")}
        lead={t("tools.tasbeehDesc")}
        nav={[
          { href: "/adhkar", label: th("items.adhkar.title") },
          { href: "/", label: th("backHome") },
        ]}
      />
      <TasbeehCounter phrases={phrases} />
    </ArabyaHubPage>
  );
}
