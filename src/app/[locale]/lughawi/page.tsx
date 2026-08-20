import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { LughawiStudio } from "@/components/lughawi/LughawiStudio";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Lughawi" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function LughawiPage({ params }: Props) {
  await resolveLocale(params);
  const t = await getTranslations("Lughawi");

  return (
    <div className="shell page-block lughawi-page">
      <header className="lughawi-hero">
        <p className="lughawi-kicker">{t("kicker")}</p>
        <h1>{t("title")}</h1>
        <p className="lughawi-hero-lead">{t("lead")}</p>
        <nav className="lughawi-local-nav" aria-label={t("title")}>
          <Link href="/lughawi" className="nav-pill is-current" aria-current="page">
            {t("navTool")}
          </Link>
          <Link href="/lughawi/features" className="nav-pill">
            {t("navFeatures")}
          </Link>
          <Link href="/lughawi/mistakes" className="nav-pill">
            {t("navMistakes")}
          </Link>
        </nav>
      </header>

      <LughawiStudio />

      <div className="lughawi-sections">
        <section>
          <h2>{t("featuresTitle")}</h2>
          <p>{t("featuresLead")}</p>
          <div className="lughawi-feature-row">
            <article>
              <h3>{t("featCorrectTitle")}</h3>
              <p>{t("featCorrectBody")}</p>
            </article>
            <article>
              <h3>{t("featRewriteTitle")}</h3>
              <p>{t("featRewriteBody")}</p>
            </article>
            <article>
              <h3>{t("featTashkeelTitle")}</h3>
              <p>{t("featTashkeelBody")}</p>
            </article>
            <article>
              <h3>{t("featTranslateTitle")}</h3>
              <p>{t("featTranslateBody")}</p>
            </article>
          </div>
        </section>

        <section>
          <h2>{t("howTitle")}</h2>
          <div className="lughawi-steps">
            <article>
              <h3>{t("how1Title")}</h3>
              <p>{t("how1Body")}</p>
            </article>
            <article>
              <h3>{t("how2Title")}</h3>
              <p>{t("how2Body")}</p>
            </article>
            <article>
              <h3>{t("how3Title")}</h3>
              <p>{t("how3Body")}</p>
            </article>
          </div>
        </section>

        <section>
          <h2>{t("whoTitle")}</h2>
          <div className="lughawi-feature-row">
            <article>
              <h3>{t("whoStudents")}</h3>
            </article>
            <article>
              <h3>{t("whoWriters")}</h3>
            </article>
            <article>
              <h3>{t("whoPros")}</h3>
            </article>
            <article>
              <h3>{t("whoLearners")}</h3>
            </article>
          </div>
        </section>

        <section>
          <h2>{t("mistakesTitle")}</h2>
          <div className="lughawi-feature-row">
            <article>
              <h3>{t("mistakeHamza")}</h3>
            </article>
            <article>
              <h3>{t("mistakeTa")}</h3>
            </article>
            <article>
              <h3>{t("mistakeAlef")}</h3>
            </article>
            <article>
              <h3>{t("mistakeSolar")}</h3>
            </article>
          </div>
          <p style={{ marginTop: "1rem" }}>
            <Link href="/lughawi/mistakes">{t("navMistakes")}</Link>
          </p>
        </section>

        <section className="lughawi-faq">
          <h2>{t("faqTitle")}</h2>
          <details>
            <summary>{t("faqFreeQ")}</summary>
            <p>{t("faqFreeA")}</p>
          </details>
          <details>
            <summary>{t("faqMsaQ")}</summary>
            <p>{t("faqMsaA")}</p>
          </details>
          <details>
            <summary>{t("faqStoreQ")}</summary>
            <p>{t("faqStoreA")}</p>
          </details>
        </section>

        <p className="lughawi-muted">{t("disclaimer")}</p>
      </div>
    </div>
  );
}
