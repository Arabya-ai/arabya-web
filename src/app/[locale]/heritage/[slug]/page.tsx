import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getHeritageWork, listHeritageWorks } from "@/lib/heritage";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateStaticParams() {
  const works = await listHeritageWorks();
  return works.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const work = await getHeritageWork(slug);
  if (!work) return {};
  return {
    title: `${locale === "en" ? work.titleEn : work.titleAr} · Arabya`,
    description:
      locale === "en" ? work.descriptionEn : work.descriptionAr,
  };
}

export default async function HeritageWorkPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const { slug } = await params;
  const t = await getTranslations({ locale, namespace: "Heritage" });
  const work = await getHeritageWork(slug);
  if (!work) notFound();

  const title = locale === "en" ? work.titleEn : work.titleAr;

  return (
    <div className="shell page-block heritage-page">
      <nav className="library-breadcrumbs" aria-label="Breadcrumb">
        <Link href="/heritage">{t("title")}</Link>
        <span aria-hidden>/</span>
        <span aria-current="page">{title}</span>
      </nav>

      <h1>{title}</h1>
      <p className="layer-hint">
        {locale === "en" ? work.descriptionEn : work.descriptionAr}
      </p>

      <div className="heritage-passages">
        {work.passages.map((p) => (
          <article key={p.id} className="heritage-passage">
            <h2>{locale === "en" ? p.titleEn : p.titleAr}</h2>
            {p.meter ? (
              <p className="heritage-meter">
                {t("meter", { meter: p.meter })}
              </p>
            ) : null}
            <p className="heritage-text" dir="rtl" lang="ar">
              {p.textAr}
            </p>
            <p className="heritage-passage-id">{p.id}</p>
          </article>
        ))}
      </div>

      <p className="layer-hint">{t("wordLayersSoon")}</p>
      <p>
        <Link href="/heritage">{t("backHub")}</Link>
      </p>
    </div>
  );
}
