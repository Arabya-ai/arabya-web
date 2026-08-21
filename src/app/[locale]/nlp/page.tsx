import { redirect } from "next/navigation";

type Props = { params: Promise<{ locale: string }> };

/**
 * Legacy hub «أدوات اللغة» — product brand is only «لغوي».
 * Keep the route for old bookmarks; catalog no longer lists /nlp.
 */
export default async function NlpRedirectPage({ params }: Props) {
  const { locale } = await params;
  redirect(`/${locale}/lughawi`);
}
