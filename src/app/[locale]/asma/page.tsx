import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { toArabicNumerals } from "@/lib/format";
import { getAsmaNames } from "@/lib/asma";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

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
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const names = await getAsmaNames();

  return (
    <ArabyaHubPage className="asma-page">
      <ArabyaHubHero
        icon="asma"
        iconLabel={t("title")}
        title={t("title")}
        lead={t("pageIntro", {
          count:
            locale === "en"
              ? String(names.length || 99)
              : toArabicNumerals(names.length || 99),
        })}
        nav={[
          { href: "/", label: th("backHome") },
          { href: "/adhkar", label: th("items.adhkar.title") },
          { href: "/services", label: th("viewAll") },
        ]}
      />

      {names.length === 0 ? (
        <p className="empty-state">{t("empty")}</p>
      ) : (
        <ul className="asma-grid">
          {names.map((n) => (
            <li key={n.number}>
              <Link href={`/asma/${n.number}`} className="asma-grid-link">
                <span className="asma-grid-num">
                  {locale === "en"
                    ? String(n.number)
                    : toArabicNumerals(n.number)}
                </span>
                <span className="asma-grid-name">{n.nameAr}</span>
                <span className="asma-grid-trans">{n.transliteration}</span>
                {(locale === "en"
                  ? n.meaningEn || n.meaningAr
                  : n.meaningAr || n.meaningEn) ? (
                  <span className="asma-grid-meaning">
                    {locale === "en"
                      ? n.meaningEn || n.meaningAr
                      : n.meaningAr || n.meaningEn}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </ArabyaHubPage>
  );
}
