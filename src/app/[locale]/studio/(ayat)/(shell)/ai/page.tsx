import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import AiLanding from "@/mpt-studio/pages/AiLanding";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StudioAi" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

export default async function MptAiPage({ params }: Props) {
  await resolveLocale(params);
  return <AiLanding />;
}
