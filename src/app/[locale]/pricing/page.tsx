import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Pricing" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function PricingPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Pricing" });
  const th = await getTranslations({ locale, namespace: "ServicesHub" });

  return (
    <ArabyaHubPage className="pricing-page">
      <ArabyaHubHero
        icon="studio"
        iconLabel={t("title")}
        title={t("title")}
        lead={t("lead")}
        nav={[
          { href: "/", label: th("backHome") },
          { href: "/create", label: t("createHub") },
          { href: "/services", label: th("viewAll") },
        ]}
      />
      <div className="pricing-grid">
        <section className="pricing-card" aria-labelledby="plan-free">
          <h2 id="plan-free">{t("freeTitle")}</h2>
          <ul>
            <li>{t("free0")}</li>
            <li>{t("free1")}</li>
            <li>{t("free2")}</li>
          </ul>
        </section>
        <section className="pricing-card pricing-card--plus" aria-labelledby="plan-plus">
          <h2 id="plan-plus">{t("plusTitle")}</h2>
          <ul>
            <li>{t("plus0")}</li>
            <li>{t("plus1")}</li>
            <li>{t("plus2")}</li>
            <li>{t("plus3")}</li>
          </ul>
        </section>
      </div>
      <p className="pricing-paypal-note">{t("paypalSoon")}</p>
      <p className="dash-muted">{t("manualUpgrade")}</p>
    </ArabyaHubPage>
  );
}
