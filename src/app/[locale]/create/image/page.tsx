import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

/** Legacy PNG route → full Ayat Studio. */
export default async function LegacyCreateImagePage({ params }: Props) {
  const locale = await resolveLocale(params);
  redirect({ href: "/create/projects/new", locale });
}
