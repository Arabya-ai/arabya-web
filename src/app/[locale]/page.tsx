import { getTranslations } from "next-intl/server";
import { SurahIndex } from "@/components/SurahIndex";
import { ContinueReading } from "@/components/ContinueReading";
import { ReadingHabitCard } from "@/components/ReadingHabitCard";
import { PrayerTimesCard } from "@/components/PrayerTimesCard";
import { AsmaAlHusnaCard } from "@/components/AsmaAlHusnaCard";
import { StudyAssistant } from "@/components/StudyAssistant";
import { StudyHashRedirect } from "@/components/StudyHashRedirect";
import { getMushafIndex } from "@/lib/mushaf";
import { getSurahs } from "@/lib/quran";

export default async function HomePage() {
  const t = await getTranslations("Home");
  const [surahs, mushafIndex] = await Promise.all([
    getSurahs(),
    getMushafIndex(),
  ]);

  return (
    <div className="shell home-simple">
      <StudyHashRedirect />
      <header className="home-title-block">
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
        <ContinueReading />
      </header>
      <SurahIndex
        surahs={surahs}
        mushafFirstPage={mushafIndex.surahFirstPage}
      />
      <StudyAssistant />
      <ReadingHabitCard />
      <PrayerTimesCard />
      <AsmaAlHusnaCard />
    </div>
  );
}
