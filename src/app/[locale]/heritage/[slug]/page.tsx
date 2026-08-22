import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getHeritageWork, listHeritageWorks } from "@/lib/heritage";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

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
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const work = await getHeritageWork(slug);
  if (!work) notFound();

  const title = locale === "en" ? work.titleEn : work.titleAr;
  const description =
    locale === "en" ? work.descriptionEn : work.descriptionAr;

  return (
    <ArabyaHubPage className="heritage-page">
      <ArabyaHubHero
        icon="heritage"
        iconLabel={title}
        kicker={t(`kind.${work.kind}` as "kind.poetry")}
        title={title}
        lead={description}
        nav={[
          { href: "/heritage", label: t("title") },
          { href: "/hadith", label: th("items.hadith.title") },
          { href: "/", label: th("backHome") },
        ]}
      />

      <div className="heritage-passages">
        {work.passages.map((p) => (
          <article key={p.id} className="heritage-passage">
            <h2>{locale === "en" ? p.titleEn : p.titleAr}</h2>
            {p.meter ? (
              <p className="heritage-meter">
                {t("meter", { meter: p.meter })}
              </p>
            ) : null}
            {p.dateNote ? (
              <p className="heritage-meter">{p.dateNote}</p>
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
        <Link href="/heritage" className="nav-pill">
          {t("backHub")}
        </Link>
      </p>
    </ArabyaHubPage>
  );
}
