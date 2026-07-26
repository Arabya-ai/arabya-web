import { redirectLocalized, resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

/** Legacy studio queue → account edit hub. */
export default async function StudioQueueRedirect({ params }: Props) {
  const locale = await resolveLocale(params);
  redirectLocalized("/account/edit/queue", locale);
}
