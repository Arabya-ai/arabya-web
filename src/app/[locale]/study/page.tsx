import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { StudyAssistant } from "@/components/StudyAssistant";

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

  return (
    <div className="shell page-block study-page">
      <nav className="surah-nav" aria-label={t("navAria")}>
        <Link href="/" className="nav-pill">
          {t("backIndex")}
        </Link>
      </nav>
      <StudyAssistant />
    </div>
  );
}
