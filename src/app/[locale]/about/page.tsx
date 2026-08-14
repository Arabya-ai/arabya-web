import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { InfoHeroNav } from "@/components/info/InfoHeroNav";
import { resolveLocale } from "@/i18n/locale-params";
import { buildInfoHeroNavItems } from "@/lib/info-hero-nav";

type Props = { params: Promise<{ locale: string }> };

const richTags = {
  brand: (c: ReactNode) => <strong className="info-em">{c}</strong>,
  strong: (c: ReactNode) => <strong>{c}</strong>,
  siteLink: (c: ReactNode) => (
    <a href="https://www.arabya.org" rel="noreferrer">
      {c}
    </a>
  ),
  indexLink: (c: ReactNode) => <Link href="/">{c}</Link>,
  mushafLink: (c: ReactNode) => <Link href="/mushaf/1">{c}</Link>,
  juzLink: (c: ReactNode) => <Link href="/juz">{c}</Link>,
  ayahLink: (c: ReactNode) => <Link href="/ayah/1/1">{c}</Link>,
  studyLink: (c: ReactNode) => <Link href="/study">{c}</Link>,
  rootsLink: (c: ReactNode) => <Link href="/roots">{c}</Link>,
  asmaLink: (c: ReactNode) => <Link href="/asma">{c}</Link>,
  studioLink: (c: ReactNode) => <Link href="/studio">{c}</Link>,
  booksLink: (c: ReactNode) => <span>{c}</span>,
  resourcesLink: (c: ReactNode) => <Link href="/resources">{c}</Link>,
  qLink: (c: ReactNode) => (
    <a href="https://quran.com" rel="noreferrer" target="_blank">
      {c}
    </a>
  ),
  cLink: (c: ReactNode) => (
    <a href="http://corpus.quran.com" rel="noreferrer" target="_blank">
      {c}
    </a>
  ),
  code: (c: ReactNode) => <code>{c}</code>,
  privacyLink: (c: ReactNode) => <Link href="/privacy">{c}</Link>,
  termsLink: (c: ReactNode) => <Link href="/terms">{c}</Link>,
  contactLink: (c: ReactNode) => <Link href="/contact">{c}</Link>,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "About" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function AboutPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "About" });

  const pillars = ["p0", "p1", "p2", "p3"] as const;
  const reading = ["r0", "r1", "r2", "r3"] as const;
  const study = ["s0", "s1", "s2"] as const;
  const tools = ["t0", "t1", "t2"] as const;
  const sources = ["qurancom", "corpus", "lemma", "asmaData"] as const;
  const nextItems = ["n0", "n1", "n2"] as const;

  return (
    <div className="info-page">
      <div className="shell info-page-shell">
        <header className="info-hero">
          <p className="info-kicker">{t("kicker")}</p>
          <h1 className="info-title portal-display">{t("title")}</h1>
          <p className="info-lead">{t.rich("lead", richTags)}</p>
          <p className="info-free-note">{t("freeNote")}</p>
          <InfoHeroNav items={buildInfoHeroNavItems((key) => t(key))} />
        </header>

        <section className="info-section" aria-labelledby="about-pillars">
          <h2 id="about-pillars" className="info-section-title">
            {t("sections.pillars.title")}
          </h2>
          <p className="info-section-lead">{t("sections.pillars.intro")}</p>
          <ul className="info-pillars">
            {pillars.map((key) => (
              <li key={key} className="info-pillar">
                <h3>{t(`sections.pillars.${key}Title`)}</h3>
                <p>{t(`sections.pillars.${key}`)}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="info-section" aria-labelledby="about-features">
          <h2 id="about-features" className="info-section-title">
            {t("sections.features.title")}
          </h2>

          <div className="info-feature-block">
            <h3>{t("sections.features.readingTitle")}</h3>
            <ul className="info-list">
              {reading.map((key) => (
                <li key={key}>{t.rich(`sections.features.${key}`, richTags)}</li>
              ))}
            </ul>
          </div>

          <div className="info-feature-block">
            <h3>{t("sections.features.studyTitle")}</h3>
            <ul className="info-list">
              {study.map((key) => (
                <li key={key}>{t.rich(`sections.features.${key}`, richTags)}</li>
              ))}
            </ul>
          </div>

          <div className="info-feature-block">
            <h3>{t("sections.features.toolsTitle")}</h3>
            <ul className="info-list">
              {tools.map((key) => (
                <li key={key}>{t.rich(`sections.features.${key}`, richTags)}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="info-section" aria-labelledby="about-sources">
          <h2 id="about-sources" className="info-section-title">
            {t("sections.sources.title")}
          </h2>
          <p className="info-section-lead">{t("sections.sources.intro")}</p>
          <ul className="info-list">
            {sources.map((key) => (
              <li key={key}>{t.rich(`sections.sources.${key}`, richTags)}</li>
            ))}
          </ul>
          <p className="info-note">{t.rich("sections.sources.gitFirst", richTags)}</p>
        </section>

        <section className="info-section" aria-labelledby="about-next">
          <h2 id="about-next" className="info-section-title">
            {t("sections.next.title")}
          </h2>
          <p className="info-section-lead">{t("sections.next.intro")}</p>
          <ul className="info-list">
            {nextItems.map((key) => (
              <li key={key}>{t(`sections.next.${key}`)}</li>
            ))}
          </ul>
        </section>

        <section className="info-section info-section--contact" aria-labelledby="about-contact">
          <h2 id="about-contact" className="info-section-title">
            {t("sections.contact.title")}
          </h2>
          <p>{t.rich("sections.contact.body", richTags)}</p>
        </section>
      </div>
    </div>
  );
}
