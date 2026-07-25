import Dashboard from "@/ayat-studio/pages/Dashboard";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

export default async function CreateDashboardPage({ params }: Props) {
  await resolveLocale(params);
  return <Dashboard />;
}
