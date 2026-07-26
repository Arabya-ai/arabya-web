import { redirectLocalized, resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

/** Legacy studio sources → account edit hub. */
export default async function StudioSourcesRedirect({ params }: Props) {
  const locale = await resolveLocale(params);
  redirectLocalized("/account/edit/sources", locale);
}
