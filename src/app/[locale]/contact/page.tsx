import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { InfoHeroNav } from "@/components/info/InfoHeroNav";
import { resolveLocale } from "@/i18n/locale-params";
import { CONTACT_EMAIL } from "@/lib/contact";
import { buildInfoHeroNavItems } from "@/lib/info-hero-nav";

type Props = { params: Promise<{ locale: string }> };

const richTags = {
  brand: (c: ReactNode) => <strong className="info-em">{c}</strong>,
  strong: (c: ReactNode) => <strong>{c}</strong>,
  emailLink: (c: ReactNode) => (
    <a href={`mailto:${CONTACT_EMAIL}`}>{c}</a>
  ),
  privacyLink: (c: ReactNode) => <Link href="/privacy">{c}</Link>,
  termsLink: (c: ReactNode) => <Link href="/terms">{c}</Link>,
  aboutLink: (c: ReactNode) => <Link href="/about">{c}</Link>,
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Contact" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function ContactPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Contact" });
  const tAbout = await getTranslations({ locale, namespace: "About" });

  const topics = ["t0", "t1", "t2"] as const;

  return (
    <div className="info-page">
      <div className="shell info-page-shell">
        <header className="info-hero">
          <p className="info-kicker">{t("kicker")}</p>
          <h1 className="info-title portal-display">{t("title")}</h1>
          <p className="info-lead">{t.rich("lead", richTags)}</p>
          <InfoHeroNav
            items={buildInfoHeroNavItems((key) => tAbout(key))}
          />
        </header>

        <section className="info-section" aria-labelledby="contact-email">
          <h2 id="contact-email" className="info-section-title">
            {t("sections.email.title")}
          </h2>
          <p>{t("sections.email.p0")}</p>
          <p className="info-contact-email">
            <a className="info-btn info-btn--primary" href={`mailto:${CONTACT_EMAIL}`}>
              {CONTACT_EMAIL}
            </a>
          </p>
          <p className="info-note">{t("sections.email.note")}</p>
        </section>

        <section className="info-section" aria-labelledby="contact-topics">
          <h2 id="contact-topics" className="info-section-title">
            {t("sections.topics.title")}
          </h2>
          <ul className="info-list info-list--check">
            {topics.map((key) => (
              <li key={key}>{t(`sections.topics.${key}`)}</li>
            ))}
          </ul>
        </section>

        <section className="info-section" aria-labelledby="contact-response">
          <h2 id="contact-response" className="info-section-title">
            {t("sections.response.title")}
          </h2>
          <p>{t("sections.response.p0")}</p>
        </section>

        <section className="info-section info-section--contact" aria-labelledby="contact-legal">
          <h2 id="contact-legal" className="info-section-title">
            {t("sections.legal.title")}
          </h2>
          <p>{t.rich("sections.legal.body", richTags)}</p>
        </section>
      </div>
    </div>
  );
}
