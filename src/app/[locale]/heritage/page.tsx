import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Heritage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function HeritageHubPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Heritage" });

  return (
    <div className="shell page-block">
      <h1>{t("title")}</h1>
      <p>{t("lead")}</p>
      <p>
        <Link href="/library" className="nav-pill">
          {t("libraryLink")}
        </Link>
      </p>
      <p className="layer-soon">{t("soon")}</p>
      <p>
        <Link href="/hadith">{t("hadithLink")}</Link> ·{" "}
        <Link href="/">{t("indexLink")}</Link>
      </p>
    </div>
  );
}
