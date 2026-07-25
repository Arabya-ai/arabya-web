import Exports from "@/ayat-studio/pages/Exports";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

export default async function CreateExportsPage({ params }: Props) {
  await resolveLocale(params);
  return <Exports />;
}
