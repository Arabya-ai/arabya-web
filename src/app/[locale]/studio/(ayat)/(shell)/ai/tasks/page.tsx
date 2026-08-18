import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { resolveLocale } from "@/i18n/locale-params";
import AiTasks from "@/mpt-studio/pages/AiTasks";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "StudioAi" });
  return { title: t("tasksMetaTitle"), description: t("metaDescription") };
}

export default async function MptAiTasksPage({ params }: Props) {
  await resolveLocale(params);
  return <AiTasks />;
}
