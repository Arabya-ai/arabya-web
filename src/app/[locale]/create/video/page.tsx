import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";
import { studioCreateFromAyahHref } from "@/ayat-studio/lib/studio-paths";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ s?: string; v?: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Create" });
  return { title: t("videoMetaTitle"), description: t("videoMetaDescription") };
}

/** Legacy /create/video → Studio with ayah context (free plan included). */
export default async function CreateVideoPage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  const sp = await searchParams;
  const initialSurah = Math.min(114, Math.max(1, Number(sp.s) || 1));
  const initialVerse = Math.max(1, Number(sp.v) || 1);
  const target = studioCreateFromAyahHref({
    surahId: initialSurah,
    verse: initialVerse,
    kind: "video",
  });

  const session = await auth();
  if (!session?.user) {
    redirectLocalized(
      `/login?callbackUrl=${encodeURIComponent(target)}`,
      locale,
    );
  }

  redirectLocalized(target, locale);
}
