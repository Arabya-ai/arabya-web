import "@/components/services/services-hub.css";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import tajweedLegend from "../../../../data/qiraat/tajweed-legend.json";
import tajweedSamples from "../../../../data/tajweed/samples.json";
import {
  TajweedService,
  type TajweedRule,
  type TajweedSample,
} from "@/components/tajweed/TajweedService";

type Props = { params: Promise<{ locale: string }> };

const rules = (tajweedLegend.rules ?? []) as TajweedRule[];
const samples = (tajweedSamples.samples ?? []) as TajweedSample[];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "TajweedService" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function TajweedPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "TajweedService" });

  return (
    <div className="shell page-block tajweed-svc-page">
      <nav className="surah-nav" aria-label={t("navAria")}>
        <Link href="/services" className="nav-pill">
          {t("backServices")}
        </Link>
        <Link href="/qiraat" className="nav-pill">
          {t("toQiraat")}
        </Link>
      </nav>

      <header className="services-hub__hero">
        <h1>{t("title")}</h1>
        <p>{t("lead")}</p>
      </header>

      <TajweedService rules={rules} samples={samples} />
    </div>
  );
}
