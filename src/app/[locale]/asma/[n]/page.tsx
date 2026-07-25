import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import { toArabicNumerals } from "@/lib/format";
import { getAsmaByNumber } from "@/lib/asma";

type Props = { params: Promise<{ locale: string; n: string }> };

function plainEn(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, n } = await params;
  const num = Number(n);
  const entry = Number.isInteger(num) ? await getAsmaByNumber(num) : null;
  const t = await getTranslations({ locale, namespace: "Asma" });
  if (!entry) return { title: t("detailMetaFallback") };
  const description =
    locale === "en"
      ? entry.meaningEn ||
        entry.explanationEn ||
        entry.detailsEn ||
        entry.meaningAr
      : entry.meaningAr || entry.explanationAr || entry.meaningEn;
  return {
    title: t("detailMetaTitle", { name: entry.nameAr }),
    description: description
      ? plainEn(description).slice(0, 160)
      : undefined,
  };
}

export async function generateStaticParams() {
  return Array.from({ length: 99 }, (_, i) => ({ n: String(i + 1) }));
}

export default async function AsmaDetailPage({ params }: Props) {
  const { locale, n } = await params;
  const t = await getTranslations("Asma");
  const tNav = await getTranslations("Nav");
  const num = Number(n);
  if (!Number.isInteger(num) || num < 1 || num > 99) notFound();
  const entry = await getAsmaByNumber(num);
  if (!entry) notFound();

  const prev = num > 1 ? num - 1 : null;
  const next = num < 99 ? num + 1 : null;
  const isEn = locale === "en";
  const numberLabel = isEn
    ? String(entry.number)
    : toArabicNumerals(entry.number);
  const meaningPrimary = isEn ? entry.meaningEn : entry.meaningAr;
  const meaningSecondary = isEn ? entry.meaningAr : entry.meaningEn;
  const explPrimary = isEn
    ? entry.explanationEn || plainEn(entry.detailsEn)
    : entry.explanationAr;
  const explSecondary = isEn
    ? entry.explanationAr
    : entry.explanationEn ||
      (entry.detailsEn ? plainEn(entry.detailsEn) : "");

  return (
    <div className="shell page-block asma-detail">
      <nav className="surah-nav" aria-label={t("navAria")}>
        <Link href="/asma" className="nav-pill">
          {t("backAll")}
        </Link>
        <Link href="/" className="nav-pill">
          {tNav("index")}
        </Link>
      </nav>

      <header className="asma-detail-head">
        <p className="asma-detail-num">{numberLabel}</p>
        <h1>{entry.nameAr}</h1>
        <p className="asma-detail-trans">{entry.transliteration}</p>
      </header>

      <section className="asma-detail-card" aria-labelledby="asma-meaning">
        <h2 id="asma-meaning">{t("meaningHeading")}</h2>
        {meaningPrimary ? (
          <p
            className={isEn ? "asma-bilingual-en" : "asma-bilingual-ar"}
            lang={isEn ? "en" : "ar"}
            dir={isEn ? "ltr" : "rtl"}
          >
            {meaningPrimary}
          </p>
        ) : null}
        {meaningSecondary ? (
          <p
            className={isEn ? "asma-bilingual-ar" : "asma-bilingual-en"}
            lang={isEn ? "ar" : "en"}
            dir={isEn ? "rtl" : "ltr"}
          >
            {meaningSecondary}
          </p>
        ) : null}
      </section>

      <section className="asma-detail-card" aria-labelledby="asma-expl">
        <h2 id="asma-expl">{t("explHeading")}</h2>
        {explPrimary ? (
          <p
            className={
              isEn
                ? "asma-bilingual-en asma-detail-en-body"
                : "asma-bilingual-ar"
            }
            lang={isEn ? "en" : "ar"}
            dir={isEn ? "ltr" : "rtl"}
          >
            {explPrimary}
          </p>
        ) : null}
        {explSecondary && explSecondary !== explPrimary ? (
          <p
            className={
              isEn
                ? "asma-bilingual-ar"
                : "asma-bilingual-en asma-detail-en-body"
            }
            lang={isEn ? "ar" : "en"}
            dir={isEn ? "rtl" : "ltr"}
          >
            {explSecondary}
          </p>
        ) : null}
      </section>

      <nav className="asma-detail-pager" aria-label={t("pagerAria")}>
        {prev ? (
          <Link href={`/asma/${prev}`} className="nav-pill">
            {t("prev")}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={`/asma/${next}`} className="nav-pill">
            {t("next")}
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
