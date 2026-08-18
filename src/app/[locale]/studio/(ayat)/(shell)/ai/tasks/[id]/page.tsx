import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import { isSafeTaskId } from "@/lib/mpt-payload";
import { notFound } from "next/navigation";
import AiTaskDetail from "@/mpt-studio/pages/AiTaskDetail";

type Props = { params: Promise<{ locale: string; id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StudioAi" });
  return { title: t("taskMetaTitle"), description: t("metaDescription") };
}

export default async function MptAiTaskDetailPage({ params }: Props) {
  const resolved = await params;
  await resolveLocale(params);
  if (!isSafeTaskId(resolved.id)) notFound();
  return <AiTaskDetail taskId={resolved.id} />;
}
