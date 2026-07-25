import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

const richTags = {
  brand: (c: ReactNode) => <strong>{c}</strong>,
  strong: (c: ReactNode) => <strong>{c}</strong>,
  ghOrgLink: (c: ReactNode) => (
    <a href="https://github.com/Arabya-ai" rel="noreferrer" target="_blank">
      {c}
    </a>
  ),
  vaLink: (c: ReactNode) => (
    <a
      href="https://vercel.com/docs/analytics"
      rel="noreferrer"
      target="_blank"
    >
      {c}
    </a>
  ),
  aboutLink: (c: ReactNode) => <Link href="/about">{c}</Link>,
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

  return (
    <div className="shell privacy-page page-block legal-page">
      <h1>{t("title")}</h1>
      <p className="legal-lead">{t.rich("lead", richTags)}</p>
      <p className="legal-updated">
        {t("updatedLabel", { date: t("updated") })}
      </p>

      <section aria-labelledby="privacy-summary">
        <h2 id="privacy-summary">{t("sections.summary.title")}</h2>
        <ul>
          <li>{t("sections.summary.s0")}</li>
          <li>{t.rich("sections.summary.s1", richTags)}</li>
          <li>{t("sections.summary.s2")}</li>
          <li>{t("sections.summary.s3")}</li>
        </ul>
      </section>

      <section aria-labelledby="privacy-accounts">
        <h2 id="privacy-accounts">{t("sections.accounts.title")}</h2>
        <p>{t("sections.accounts.p0")}</p>
        <p>{t("sections.accounts.p1")}</p>
      </section>

      <section aria-labelledby="privacy-sync">
        <h2 id="privacy-sync">{t("sections.sync.title")}</h2>
        <p>{t("sections.sync.p0")}</p>
        <ul>
          <li>{t("sections.sync.i0")}</li>
          <li>{t("sections.sync.i1")}</li>
          <li>{t("sections.sync.i2")}</li>
        </ul>
        <p>{t("sections.sync.p1")}</p>
      </section>

      <section aria-labelledby="privacy-local">
        <h2 id="privacy-local">{t("sections.local.title")}</h2>
        <p>{t("sections.local.p0")}</p>
      </section>

      <section aria-labelledby="privacy-server">
        <h2 id="privacy-server">{t("sections.server.title")}</h2>
        <ul>
          <li>{t.rich("sections.server.site", richTags)}</li>
          <li>{t.rich("sections.server.sync", richTags)}</li>
          <li>{t.rich("sections.server.login", richTags)}</li>
          <li>{t.rich("sections.server.analytics", richTags)}</li>
          <li>{t.rich("sections.server.media", richTags)}</li>
        </ul>
      </section>

      <section aria-labelledby="privacy-cookies">
        <h2 id="privacy-cookies">{t("sections.cookies.title")}</h2>
        <p>{t("sections.cookies.p0")}</p>
      </section>

      <section aria-labelledby="privacy-rights">
        <h2 id="privacy-rights">{t("sections.rights.title")}</h2>
        <ul>
          <li>{t("sections.rights.r0")}</li>
          <li>{t("sections.rights.r1")}</li>
          <li>{t.rich("sections.rights.r2", richTags)}</li>
        </ul>
      </section>

      <section aria-labelledby="privacy-changes">
        <h2 id="privacy-changes">{t("sections.changes.title")}</h2>
        <p>{t.rich("sections.changes.p0", richTags)}</p>
      </section>
    </div>
  );
}
