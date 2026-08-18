import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { getDuas } from "@/lib/adhkar";
import { AdhkarLocalNav } from "@/components/AdhkarLocalNav";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  return {
    title: t("duasMetaTitle"),
    description: t("duasMetaDescription"),
  };
}

export default async function DuasPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Adhkar" });
  const duas = await getDuas();

  return (
    <div className="shell page-block adhkar-page">
      <AdhkarLocalNav locale={locale} current="duas" />

      <header className="asma-page-head">
        <h1>{t("tools.duas")}</h1>
        <p>{t("tools.duasDesc")}</p>
      </header>

      {duas.length === 0 ? (
        <p className="empty-state">{t("duasEmpty")}</p>
      ) : (
        <ul className="adhkar-dua-list">
          {duas.map((dua) => {
            const category =
              locale === "en" ? dua.categoryEn : dua.categoryAr;
            return (
              <li key={dua.id}>
                <article className="adhkar-card">
                  <p className="adhkar-dua-cat">{category}</p>
                  <p className="adhkar-card-text" lang="ar" dir="rtl">
                    {dua.textAr}
                  </p>
                  {dua.source ? (
                    <p className="adhkar-card-source">
                      {t("sourceLabel", { source: dua.source })}
                    </p>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
