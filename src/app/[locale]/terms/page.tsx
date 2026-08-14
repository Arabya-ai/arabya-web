import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

const richTags = {
  brand: (c: ReactNode) => <strong className="info-em">{c}</strong>,
  strong: (c: ReactNode) => <strong>{c}</strong>,
  privacyLink: (c: ReactNode) => <Link href="/privacy">{c}</Link>,
  aboutLink: (c: ReactNode) => <Link href="/about">{c}</Link>,
  contactLink: (c: ReactNode) => <Link href="/contact">{c}</Link>,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Terms" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function TermsPage({ params }: Props) {
  await resolveLocale(params);
  const t = await getTranslations("Terms");

  const summary = ["s0", "s1", "s2", "s3"] as const;
  const prohibited = ["p0", "p1", "p2", "p3"] as const;
  const ownership = ["o0", "o1", "o2"] as const;
  const sources = ["q0", "q1", "q2"] as const;

  return (
    <div className="info-page">
      <div className="shell info-page-shell">
        <header className="info-hero">
          <p className="info-kicker">{t("kicker")}</p>
          <h1 className="info-title portal-display">{t("title")}</h1>
          <p className="info-lead">{t.rich("lead", richTags)}</p>
          <p className="info-updated">
            {t("updatedLabel", { date: t("updated") })}
          </p>
        </header>

        <section className="info-section" aria-labelledby="terms-summary">
          <h2 id="terms-summary" className="info-section-title">
            {t("sections.summary.title")}
          </h2>
          <ul className="info-list info-list--check">
            {summary.map((key) => (
              <li key={key}>{t.rich(`sections.summary.${key}`, richTags)}</li>
            ))}
          </ul>
        </section>

        <section className="info-section" aria-labelledby="terms-use">
          <h2 id="terms-use" className="info-section-title">
            {t("sections.use.title")}
          </h2>
          <p>{t("sections.use.p0")}</p>
          <p>{t("sections.use.p1")}</p>
        </section>

        <section className="info-section" aria-labelledby="terms-prohibited">
          <h2 id="terms-prohibited" className="info-section-title">
            {t("sections.prohibited.title")}
          </h2>
          <ul className="info-list">
            {prohibited.map((key) => (
              <li key={key}>{t.rich(`sections.prohibited.${key}`, richTags)}</li>
            ))}
          </ul>
        </section>

        <section className="info-section" aria-labelledby="terms-ownership">
          <h2 id="terms-ownership" className="info-section-title">
            {t("sections.ownership.title")}
          </h2>
          <ul className="info-list">
            {ownership.map((key) => (
              <li key={key}>{t.rich(`sections.ownership.${key}`, richTags)}</li>
            ))}
          </ul>
        </section>

        <section className="info-section" aria-labelledby="terms-sources">
          <h2 id="terms-sources" className="info-section-title">
            {t("sections.sources.title")}
          </h2>
          <ul className="info-list">
            {sources.map((key) => (
              <li key={key}>{t.rich(`sections.sources.${key}`, richTags)}</li>
            ))}
          </ul>
        </section>

        <section className="info-section" aria-labelledby="terms-enforcement">
          <h2 id="terms-enforcement" className="info-section-title">
            {t("sections.enforcement.title")}
          </h2>
          <p>{t.rich("sections.enforcement.p0", richTags)}</p>
        </section>

        <section className="info-section info-section--contact" aria-labelledby="terms-changes">
          <h2 id="terms-changes" className="info-section-title">
            {t("sections.changes.title")}
          </h2>
          <p>{t.rich("sections.changes.p0", richTags)}</p>
        </section>
      </div>
    </div>
  );
}
