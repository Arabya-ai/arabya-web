import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { toArabicNumerals } from "@/lib/format";
import { getAsmaNames } from "@/lib/asma";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Asma" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AsmaPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Asma" });
  const names = await getAsmaNames();

  return (
    <div className="shell page-block asma-page">
      <nav className="surah-nav" aria-label={t("navAria")}>
        <Link href="/" className="nav-pill">
          {t("backIndex")}
        </Link>
      </nav>

      <header className="asma-page-head">
        <h1>{t("title")}</h1>
        <p>
          {t("pageIntro", {
            count: toArabicNumerals(names.length || 99),
          })}
        </p>
      </header>

      {names.length === 0 ? (
        <p className="empty-state">{t("empty")}</p>
      ) : (
        <ul className="asma-grid">
          {names.map((n) => (
            <li key={n.number}>
              <Link href={`/asma/${n.number}`} className="asma-grid-link">
                <span className="asma-grid-num">
                  {toArabicNumerals(n.number)}
                </span>
                <span className="asma-grid-name">{n.nameAr}</span>
                <span className="asma-grid-trans">{n.transliteration}</span>
                {n.meaningAr ? (
                  <span className="asma-grid-meaning">{n.meaningAr}</span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
