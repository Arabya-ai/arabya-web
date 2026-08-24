import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SurahIndex } from "@/components/SurahIndex";
import { ContinueReading } from "@/components/ContinueReading";
import { HomeDeferredWidgets } from "@/components/HomeDeferredWidgets";
import { HomeServicesSection } from "@/components/HomeServicesSection";
import { StudyHashRedirect } from "@/components/StudyHashRedirect";
import { WarraqHomeDeliver } from "@/components/warraq/WarraqHomeDeliver";
import { WarraqHomeGoals } from "@/components/warraq/WarraqHomeGoals";
import { WarraqHomeHero } from "@/components/warraq/WarraqHomeHero";
import { getMushafIndex } from "@/lib/mushaf";
import { getSurahs } from "@/lib/quran";

export default async function HomePage() {
  const t = await getTranslations("Home");
  const [surahs, mushafIndex] = await Promise.all([
    getSurahs(),
    getMushafIndex(),
  ]);

  return (
    <div className="shell home-simple warraq-home">
      <StudyHashRedirect />

      <WarraqHomeHero />

      <HomeServicesSection />

      <WarraqHomeDeliver />

      <section className="wrq-index-card home-index" aria-labelledby="home-index-title">
        <header className="home-index-intro">
          <h2 id="home-index-title">{t("title")}</h2>
          <p className="home-lead">{t("subtitle")}</p>
          <div className="home-index-ornament" aria-hidden="true">
            <span className="home-index-ornament-mark" />
          </div>
          <div className="home-index-toolbar">
            <Link href="/mushaf/1" className="home-tool-link home-tool-link--primary">
              {t("openMushaf")}
            </Link>
            <ContinueReading />
            <Link href="/lughawi" className="home-tool-link">
              {t("openLughawi")}
            </Link>
          </div>
        </header>
        <SurahIndex
          surahs={surahs}
          mushafFirstPage={mushafIndex.surahFirstPage}
        />
      </section>

      <WarraqHomeGoals />

      <HomeDeferredWidgets />
    </div>
  );
}
