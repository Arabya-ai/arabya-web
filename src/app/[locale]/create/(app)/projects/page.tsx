import Projects from "@/ayat-studio/pages/Projects";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

export default async function CreateProjectsPage({ params }: Props) {
  await resolveLocale(params);
  return <Projects />;
}
