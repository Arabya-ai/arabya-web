import { SurahGrid, SurahTable } from "@/components/SurahIndex";
import { getSurahs } from "@/lib/quran";

export default async function HomePage() {
  const surahs = await getSurahs();

  return (
    <>
      <section className="hero">
        <div className="shell hero-copy">
          <span className="hero-kicker">Arabya.ai</span>
          <h1>فهرس القرآن الكريم</h1>
          <p>
            تصفّح سور القرآن، وافتح أي سورة لتفسير كلماتها كلمةً كلمة — بواجهة
            عربية واضحة، جاهزة للتوسّع على arabyaai.com ثم arabya.ai.
          </p>
        </div>
      </section>

      <div className="shell">
        <section className="panel" aria-labelledby="index-title">
          <h2 id="index-title" className="sr-only">
            فهرس السور
          </h2>
          <SurahTable surahs={surahs} />
        </section>
        <SurahGrid surahs={surahs} />
      </div>
    </>
  );
}
