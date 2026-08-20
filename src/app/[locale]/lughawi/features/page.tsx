import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Lughawi" });
  return {
    title: t("featuresPageTitle"),
    description: t("featuresPageLead"),
  };
}

export default async function LughawiFeaturesPage({ params }: Props) {
  await resolveLocale(params);
  const t = await getTranslations("Lughawi");

  return (
    <div className="shell page-block lughawi-page">
      <header className="lughawi-hero">
        <p className="lughawi-kicker">{t("kicker")}</p>
        <h1>{t("featuresPageTitle")}</h1>
        <p className="lughawi-hero-lead">{t("featuresPageLead")}</p>
        <nav className="lughawi-local-nav">
          <Link href="/lughawi" className="nav-pill">
            {t("navTool")}
          </Link>
          <Link href="/lughawi/mistakes" className="nav-pill">
            {t("navMistakes")}
          </Link>
        </nav>
      </header>

      <div className="lughawi-sections">
        <section>
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
            <article>
              <h3>{t("actionTafqeet")}</h3>
              <p>{t("featCorrectBody")}</p>
            </article>
            <article>
              <h3>{t("tashkeelModes")}</h3>
              <p>
                {t("tashkeel.full")} · {t("tashkeel.partial")} ·{" "}
                {t("tashkeel.endings")} · {t("tashkeel.mandatory")}
              </p>
            </article>
          </div>
        </section>
      </div>
    </div>
  );
}
