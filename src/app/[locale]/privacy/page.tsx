import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { CONTACT_EMAIL } from "@/lib/contact";

type Props = { params: Promise<{ locale: string }> };

const richTags = {
  brand: (c: ReactNode) => <strong className="info-em">{c}</strong>,
  strong: (c: ReactNode) => <strong>{c}</strong>,
  aboutLink: (c: ReactNode) => <Link href="/about">{c}</Link>,
  accountLink: (c: ReactNode) => <Link href="/account">{c}</Link>,
  contactLink: (c: ReactNode) => <Link href="/contact">{c}</Link>,
  emailLink: (c: ReactNode) => (
    <a href={`mailto:${CONTACT_EMAIL}`}>{c}</a>
  ),
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Privacy" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function PrivacyPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Privacy" });

  const summary = ["s0", "s1", "s2", "s3", "s4"] as const;
  const syncItems = ["i0", "i1", "i2"] as const;
  const rights = ["r0", "r1", "r2"] as const;

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

        <section className="info-section" aria-labelledby="privacy-summary">
          <h2 id="privacy-summary" className="info-section-title">
            {t("sections.summary.title")}
          </h2>
          <ul className="info-list info-list--check">
            {summary.map((key) => (
              <li key={key}>{t.rich(`sections.summary.${key}`, richTags)}</li>
            ))}
          </ul>
        </section>

        <section className="info-section" aria-labelledby="privacy-accounts">
          <h2 id="privacy-accounts" className="info-section-title">
            {t("sections.accounts.title")}
          </h2>
          <p>{t("sections.accounts.p0")}</p>
          <p>{t.rich("sections.accounts.p1", richTags)}</p>
        </section>

        <section className="info-section" aria-labelledby="privacy-sync">
          <h2 id="privacy-sync" className="info-section-title">
            {t("sections.sync.title")}
          </h2>
          <p>{t("sections.sync.p0")}</p>
          <ul className="info-list">
            {syncItems.map((key) => (
              <li key={key}>{t(`sections.sync.${key}`)}</li>
            ))}
          </ul>
          <p>{t("sections.sync.p1")}</p>
        </section>

        <section className="info-section" aria-labelledby="privacy-local">
          <h2 id="privacy-local" className="info-section-title">
            {t("sections.local.title")}
          </h2>
          <p>{t("sections.local.p0")}</p>
        </section>

        <section className="info-section" aria-labelledby="privacy-cookies">
          <h2 id="privacy-cookies" className="info-section-title">
            {t("sections.cookies.title")}
          </h2>
          <p>{t("sections.cookies.p0")}</p>
        </section>

        <section className="info-section" aria-labelledby="privacy-rights">
          <h2 id="privacy-rights" className="info-section-title">
            {t("sections.rights.title")}
          </h2>
          <ul className="info-list">
            {rights.map((key) => (
              <li key={key}>{t.rich(`sections.rights.${key}`, richTags)}</li>
            ))}
          </ul>
        </section>

        <section className="info-section info-section--contact" aria-labelledby="privacy-changes">
          <h2 id="privacy-changes" className="info-section-title">
            {t("sections.changes.title")}
          </h2>
          <p>{t.rich("sections.changes.p0", richTags)}</p>
        </section>
      </div>
    </div>
  );
}
