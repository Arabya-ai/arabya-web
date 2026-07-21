import { SurahIndex } from "@/components/SurahIndex";
import { ContinueReading } from "@/components/ContinueReading";
import { ReadingHabitCard } from "@/components/ReadingHabitCard";
import { PrayerTimesCard } from "@/components/PrayerTimesCard";
import { AsmaAlHusnaCard } from "@/components/AsmaAlHusnaCard";
import { StudyHashRedirect } from "@/components/StudyHashRedirect";
import { getMushafIndex } from "@/lib/mushaf";
import { getSurahs } from "@/lib/quran";
import Link from "next/link";

export default async function HomePage() {
  const [surahs, mushafIndex] = await Promise.all([
    getSurahs(),
    getMushafIndex(),
  ]);

  return (
    <div className="shell home-simple">
      <StudyHashRedirect />
      <header className="home-title-block">
        <h1>فهرس القرآن الكريم</h1>
        <p>اختر سورة لقراءة المصحف ودراسة كلماتها</p>
        <ContinueReading />
      </header>
      <SurahIndex
        surahs={surahs}
        mushafFirstPage={mushafIndex.surahFirstPage}
      />
      <section className="study-teaser" aria-labelledby="study-teaser-h">
        <h2 id="study-teaser-h">دراسة سريعة</h2>
        <p>
          ابحث عن كلمة أو آية: معنى وإعراب وتفسير ميسر — في صفحة مستقلة دون
          تشتيت.
        </p>
        <Link href="/study" className="habit-cta">
          ابدأ الدراسة السريعة
        </Link>
      </section>
      <ReadingHabitCard />
      <PrayerTimesCard />
      <AsmaAlHusnaCard />
    </div>
  );
}
