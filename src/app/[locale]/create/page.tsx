import type { Metadata } from "next";
import Landing from "@/ayat-studio/pages/Landing";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

export const metadata: Metadata = {
  title: "آيات ستوديو — إنشاء فيديوهات قرآنية",
  description:
    "استوديو إنشاء فيديوهات الآيات: خلفيات، قرّاء، تصدير MP4 — داخل عربية",
};

export default async function CreateLandingPage({ params }: Props) {
  await resolveLocale(params);
  return <Landing />;
}
