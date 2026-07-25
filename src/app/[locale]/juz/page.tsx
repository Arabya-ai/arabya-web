import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { JUZ_FIRST_PAGE } from "@/lib/juz";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Juz" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function JuzIndexPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Juz" });
  const items = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="shell page-block">
      <h1>{t("title")}</h1>
      <p className="table-intro">{t("intro")}</p>
      <ul className="juz-grid">
        {items.map((j) => (
          <li key={j}>
            <Link
              href={getMushafPageHref(JUZ_FIRST_PAGE[j])}
              className="juz-card"
            >
              <span className="juz-num">
                {locale === "en" ? String(j) : toArabicNumerals(j)}
              </span>
              <span className="juz-name">{t(`labels.${j}` as "labels.1")}</span>
              <span className="juz-page">
                {t("pageShort", {
                  page:
                    locale === "en"
                      ? String(JUZ_FIRST_PAGE[j])
                      : toArabicNumerals(JUZ_FIRST_PAGE[j]),
                })}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
