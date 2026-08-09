import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SurahIndex } from "@/components/SurahIndex";
import { ContinueReading } from "@/components/ContinueReading";
import { HomeDeferredWidgets } from "@/components/HomeDeferredWidgets";
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
      <section className="home-index" aria-labelledby="home-index-title">
        <header className="home-index-intro">
          <h1 id="home-index-title">{t("title")}</h1>
          <p className="home-lead">{t("subtitle")}</p>
          <div className="home-index-ornament" aria-hidden="true">
            <span className="home-index-ornament-mark" />
          </div>
          <div className="home-index-toolbar">
            <Link href="/mushaf/1" className="home-tool-link home-tool-link--primary">
              {t("openMushaf")}
            </Link>
            <ContinueReading />
          </div>
        </header>
        <SurahIndex
          surahs={surahs}
          mushafFirstPage={mushafIndex.surahFirstPage}
        />
      </section>
      <HomeDeferredWidgets />
    </div>
  );
}
