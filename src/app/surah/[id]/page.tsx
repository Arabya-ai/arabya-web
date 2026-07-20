import { redirect, notFound } from "next/navigation";
import { getFirstMushafPage, getMushafIndex } from "@/lib/mushaf";
import { getMushafPageHref } from "@/lib/format";

type Props = { params: Promise<{ id: string }> };

export default async function SurahRedirectPage({ params }: Props) {
  const { id } = await params;
  const surahId = Number(id);
  if (!Number.isInteger(surahId) || surahId < 1 || surahId > 114) notFound();

  const index = await getMushafIndex();
  const firstPage = getFirstMushafPage(surahId, index);
  redirect(getMushafPageHref(firstPage));
}
