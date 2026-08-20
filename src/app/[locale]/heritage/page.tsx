import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { listHeritageWorks } from "@/lib/heritage";

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
  const works = await listHeritageWorks();

  return (
    <div className="shell page-block heritage-page">
      <header className="adhkar-hero">
        <p className="adhkar-kicker">{t("kicker")}</p>
        <h1>{t("title")}</h1>
        <p>{t("lead")}</p>
        <div className="home-index-ornament" aria-hidden="true">
          <span className="home-index-ornament-mark" />
        </div>
      </header>

      <ul className="heritage-work-grid">
        {works.map((w) => (
          <li key={w.slug}>
            <Link href={`/heritage/${w.slug}`} className="heritage-work-card">
              <span className="heritage-kind">{t(`kind.${w.kind}` as "kind.poetry")}</span>
              <strong>{locale === "en" ? w.titleEn : w.titleAr}</strong>
              <p>{locale === "en" ? w.descriptionEn : w.descriptionAr}</p>
              <span>
                {t("passageCount", { count: w.passageCount ?? 0 })}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <p>
        <Link href="/library" className="nav-pill">
          {t("libraryLink")}
        </Link>
      </p>
      <p>
        <Link href="/hadith">{t("hadithLink")}</Link>
        {" · "}
        <Link href="/">{t("indexLink")}</Link>
      </p>
    </div>
  );
}
