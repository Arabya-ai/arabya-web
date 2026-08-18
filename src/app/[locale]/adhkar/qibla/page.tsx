import { redirect } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

/** Legacy route — qibla lives at `/qibla` since adhkar/qibla split. */
export default async function AdhkarQiblaRedirect({ params }: Props) {
  const locale = await resolveLocale(params);
  redirect({ href: "/qibla", locale });
}
