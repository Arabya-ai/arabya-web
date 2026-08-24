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

      <section className="home-hero" aria-labelledby="home-brand-title">
        <div className="home-hero__brand-pane" aria-hidden="false">
          <p className="home-hero__brand" id="home-brand-title">
            {t("brandWord")}
          </p>
        </div>
        <div className="home-hero__rule" aria-hidden="true" />
        <div className="home-hero__copy">
          <h1 className="home-hero__line">{t("heroLine")}</h1>
          <p className="home-hero__lead">{t("heroLead")}</p>
          <div className="home-hero__actions">
            <Link href="/mushaf/1" className="home-tool-link home-tool-link--primary">
              {t("openMushaf")}
            </Link>
            <ContinueReading />
            <Link href="/lughawi" className="home-hero__text-link">
              {t("openLughawi")}
            </Link>
          </div>
        </div>
      </section>

      <section className="home-index" aria-labelledby="home-index-title">
        <header className="home-index-intro">
          <h2 id="home-index-title">{t("title")}</h2>
          <p className="home-lead">{t("subtitle")}</p>
          <div className="home-index-ornament" aria-hidden="true">
            <span className="home-index-ornament-mark" />
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
