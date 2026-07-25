import NewProject from "@/ayat-studio/pages/NewProject";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

export default async function CreateNewProjectPage({ params }: Props) {
  await resolveLocale(params);
  return <NewProject />;
}
