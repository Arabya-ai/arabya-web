import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import AiCreate from "@/mpt-studio/pages/AiCreate";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StudioAi" });
  return { title: t("createMetaTitle"), description: t("metaDescription") };
}

export default async function MptAiCreatePage({ params }: Props) {
  await resolveLocale(params);
  return <AiCreate />;
}
