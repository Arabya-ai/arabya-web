import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { StudyAssistant } from "@/components/StudyAssistant";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Study" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function StudyPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Study" });
  const th = await getTranslations({ locale, namespace: "ServicesHub" });

  return (
    <ArabyaHubPage className="study-page">
      <ArabyaHubHero
        icon="study"
        iconLabel={t("title")}
        title={t("title")}
        lead={t("lead")}
        nav={[
          { href: "/", label: th("backHome") },
          { href: "/search", label: th("items.search.title") },
          { href: "/services", label: th("viewAll") },
        ]}
      />
      <StudyAssistant />
    </ArabyaHubPage>
  );
}
