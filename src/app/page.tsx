import { SurahIndex } from "@/components/SurahIndex";
import { ContinueReading } from "@/components/ContinueReading";
import { StudyAssistant } from "@/components/StudyAssistant";
import { getMushafIndex } from "@/lib/mushaf";
import { getSurahs } from "@/lib/quran";

export default async function HomePage() {
  const [surahs, mushafIndex] = await Promise.all([
    getSurahs(),
    getMushafIndex(),
  ]);

  return (
    <div className="shell home-simple">
      <header className="home-title-block">
        <h1>فهرس القرآن الكريم</h1>
        <p>اختر سورة لقراءة المصحف ودراسة كلماتها</p>
        <ContinueReading />
      </header>
      <SurahIndex
        surahs={surahs}
        mushafFirstPage={mushafIndex.surahFirstPage}
      />
      <StudyAssistant />
    </div>
  );
}
