import { notFound } from "next/navigation";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";
import { getFirstMushafPage, getMushafIndex } from "@/lib/mushaf";
import { getMushafPageHref } from "@/lib/format";

type Props = { params: Promise<{ locale: string; id: string }> };

export default async function SurahRedirectPage({ params }: Props) {
  const locale = await resolveLocale(params);

  const { id } = await params;
  const surahId = Number(id);
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) notFound();

  const index = await getMushafIndex();
  const firstPage = getFirstMushafPage(surahId, index);
  redirectLocalized(getMushafPageHref(firstPage), locale);
}
