import AccountSettings from "@/ayat-studio/pages/AccountSettings";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

export default async function CreateSettingsPage({ params }: Props) {
  await resolveLocale(params);
  return <AccountSettings />;
}
