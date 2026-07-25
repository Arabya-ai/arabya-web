import Editor from "@/ayat-studio/pages/Editor";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

export default async function CreateEditorPage({ params }: Props) {
  await resolveLocale(params);
  return <Editor />;
}
