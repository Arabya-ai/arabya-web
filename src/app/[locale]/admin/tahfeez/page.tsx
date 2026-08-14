import { redirectLocalized, resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

/** Recitation data lives on each member file in the CRM (`/admin/users`). */
export default async function AdminTahfeezRedirectPage({ params }: Props) {
  const locale = await resolveLocale(params);
  redirectLocalized("/admin/users", locale);
}
