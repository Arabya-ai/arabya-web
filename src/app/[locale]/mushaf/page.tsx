import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

/** Bare /mushaf → first Madinah page (avoids 404 for common bookmark). */
export default async function MushafIndexPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/mushaf/1`);
}
