import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { studioPath } from "@/ayat-studio/lib/studio-paths";

type Props = { params: Promise<{ locale: string }> };

/** Legacy `/create` → `/studio`. */
export default async function LegacyCreateRedirect({ params }: Props) {
  const locale = await resolveLocale(params);
  redirect({ href: studioPath("/"), locale });
}
