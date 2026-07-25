import type { ReactNode } from "react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

const richTags = {
  brand: (c: ReactNode) => <strong>{c}</strong>,
  strong: (c: ReactNode) => <strong>{c}</strong>,
  siteLink: (c: ReactNode) => (
    <a href="https://www.arabyaai.com" rel="noreferrer">
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
  booksLink: (c: ReactNode) => <Link href="/books">{c}</Link>,
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
  ghLink: (c: ReactNode) => (
    <a
      href="https://github.com/Arabya-ai/arabya-web"
      rel="noreferrer"
      target="_blank"
    >
      {c}
    </a>
  ),
  ghOrgLink: (c: ReactNode) => (
    <a href="https://github.com/Arabya-ai" rel="noreferrer" target="_blank">
      {c}
    </a>
  ),
  privacyLink: (c: ReactNode) => <Link href="/privacy">{c}</Link>,
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

  return (
    <div className="shell privacy-page page-block legal-page">
      <h1>{t("title")}</h1>
      <p className="legal-lead">{t.rich("lead", richTags)}</p>

      <section aria-labelledby="about-vision">
        <h2 id="about-vision">{t("sections.vision.title")}</h2>
        <p>{t("sections.vision.p0")}</p>
      </section>

      <section aria-labelledby="about-features">
        <h2 id="about-features">{t("sections.features.title")}</h2>

        <h3>{t("sections.features.readingTitle")}</h3>
        <ul>
          <li>{t.rich("sections.features.reading0", richTags)}</li>
          <li>{t.rich("sections.features.reading1", richTags)}</li>
          <li>{t.rich("sections.features.reading2", richTags)}</li>
          <li>{t("sections.features.reading3")}</li>
        </ul>

        <h3>{t("sections.features.studyTitle")}</h3>
        <ul>
          <li>{t.rich("sections.features.study0", richTags)}</li>
          <li>{t.rich("sections.features.study1", richTags)}</li>
          <li>{t.rich("sections.features.study2", richTags)}</li>
        </ul>

        <h3>{t("sections.features.rootsTitle")}</h3>
        <ul>
          <li>{t.rich("sections.features.roots0", richTags)}</li>
          <li>{t("sections.features.roots1")}</li>
        </ul>

        <h3>{t("sections.features.portalTitle")}</h3>
        <ul>
          <li>{t.rich("sections.features.portal0", richTags)}</li>
          <li>{t("sections.features.portal1")}</li>
          <li>{t.rich("sections.features.portal2", richTags)}</li>
          <li>{t.rich("sections.features.portal3", richTags)}</li>
        </ul>
      </section>

      <section aria-labelledby="about-sources">
        <h2 id="about-sources">{t("sections.sources.title")}</h2>
        <p>{t("sections.sources.intro")}</p>
        <ul>
          <li>{t.rich("sections.sources.qurancom", richTags)}</li>
          <li>{t.rich("sections.sources.corpus", richTags)}</li>
          <li>{t.rich("sections.sources.lemma", richTags)}</li>
          <li>{t("sections.sources.asmaData")}</li>
        </ul>
        <p>{t.rich("sections.sources.gitFirst", richTags)}</p>
      </section>

      <section aria-labelledby="about-tech">
        <h2 id="about-tech">{t("sections.tech.title")}</h2>
        <ul>
          <li>{t("sections.tech.stack")}</li>
          <li>{t.rich("sections.tech.repo", richTags)}</li>
          <li>{t("sections.tech.hosting")}</li>
        </ul>
      </section>

      <section aria-labelledby="about-roadmap">
        <h2 id="about-roadmap">{t("sections.roadmap.title")}</h2>
        <ul>
          <li>{t("sections.roadmap.r0")}</li>
          <li>{t("sections.roadmap.r1")}</li>
          <li>{t("sections.roadmap.r2")}</li>
          <li>{t("sections.roadmap.r3")}</li>
          <li>{t("sections.roadmap.r4")}</li>
        </ul>
      </section>

      <section aria-labelledby="about-contact">
        <h2 id="about-contact">{t("sections.contact.title")}</h2>
        <p>{t.rich("sections.contact.body", richTags)}</p>
      </section>
    </div>
  );
}
