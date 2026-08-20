import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getHadithItem, listHadithCollections } from "@/lib/hadith";

type Props = {
  params: Promise<{ locale: string; collection: string; number: string }>;
};

export async function generateStaticParams() {
  const collections = await listHadithCollections();
  const params: { collection: string; number: string }[] = [];
  for (const meta of collections) {
    const { getHadithCollection } = await import("@/lib/hadith");
    const full = await getHadithCollection(meta.slug);
    for (const item of full?.items ?? []) {
      params.push({ collection: meta.slug, number: String(item.number) });
    }
  }
  return params;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, collection: slug, number } = await params;
  const hit = await getHadithItem(slug, number);
  if (!hit) return {};
  const title =
    locale === "en" ? hit.collection.titleEn : hit.collection.titleAr;
  return {
    title: `${title} · ${hit.item.number} · Arabya`,
    description: hit.item.arabic.slice(0, 140),
  };
}

export default async function HadithItemPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { collection: slug, number } = await params;
  const t = await getTranslations({ locale, namespace: "Hadith" });
  const hit = await getHadithItem(slug, number);
  if (!hit) notFound();

  const { collection, item } = hit;
  const title = locale === "en" ? collection.titleEn : collection.titleAr;
  const chapter =
    locale === "en" ? item.chapterEn : item.chapterAr;

  return (
    <div className="shell page-block hadith-page">
      <nav className="library-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/hadith">{t("title")}</Link>
        <span aria-hidden>/</span>
        <Link href={`/hadith/${collection.slug}`}>{title}</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">#{item.number}</span>
      </nav>

      <article className="hadith-article">
        <p className="hadith-article-meta">
          {title}
          {chapter ? ` · ${chapter}` : ""}
          {item.grade ? ` · ${item.grade}` : ""}
        </p>
        <p className="hadith-article-id">{item.id}</p>
        <blockquote className="hadith-matn" dir="rtl" lang="ar">
          {item.arabic}
        </blockquote>
        <p className="layer-hint">{t("wordLayersSoon")}</p>
      </article>

      <p>
        <Link href={`/hadith/${collection.slug}`}>{t("backCollection")}</Link>
      </p>
    </div>
  );
}
