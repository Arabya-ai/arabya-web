import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { studioPath } from "@/ayat-studio/lib/studio-paths";

type Props = { params: Promise<{ locale: string }> };

export default async function LegacyCreateImageRedirect({ params }: Props) {
  const locale = await resolveLocale(params);
  redirect({ href: studioPath("/projects/new"), locale });
}
