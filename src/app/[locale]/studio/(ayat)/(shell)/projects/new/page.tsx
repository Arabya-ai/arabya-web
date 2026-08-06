import { Suspense } from "react";
import NewProject from "@/ayat-studio/pages/NewProject";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

export default async function CreateNewProjectPage({ params }: Props) {
  await resolveLocale(params);
  return (
    <Suspense
      fallback={
        <p className="p-6 text-center text-sm text-muted-foreground">
          جاري تجهيز المشروع…
        </p>
      }
    >
      <NewProject />
    </Suspense>
  );
}
