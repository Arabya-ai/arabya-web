import { SurahIndex } from "@/components/SurahIndex";
import { ContinueReading } from "@/components/ContinueReading";
import { StudyAssistant } from "@/components/StudyAssistant";
import { getSurahs } from "@/lib/quran";

export default async function HomePage() {
  const surahs = await getSurahs();

  return (
    <div className="shell home-simple">
      <header className="home-title-block">
        <h1>فهرس القرآن الكريم</h1>
        <p>اختر سورة لقراءة المصحف ودراسة كلماتها</p>
        <ContinueReading />
      </header>
      <StudyAssistant />
      <SurahIndex surahs={surahs} />
    </div>
  );
}
