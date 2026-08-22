import { Link } from "@/i18n/navigation";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getRootEntry } from "@/lib/quran";
import { formatCount } from "@/lib/format";
import { getMushafIndex } from "@/lib/mushaf";
import { getLemmaSenseFile, summarizeRootLemmas } from "@/lib/roots";
import { RootOccurrencesList } from "@/components/RootOccurrencesList";
import { PageShareButton } from "@/components/PageShareButton";
import { buildSocialMetadata } from "@/lib/og-meta";
import { shareOgImageUrl } from "@/lib/share";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

type Props = { params: Promise<{ locale: string; root: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, root } = await params;
  const decoded = decodeURIComponent(root);
  const t = await getTranslations({ locale, namespace: "Roots" });
  const title = t("detailMetaTitle", { root: decoded });
  const description = t("detailMetaDescription", { root: decoded });
  const social = buildSocialMetadata({
    title,
    description,
    url: `/root/${encodeURIComponent(decoded)}?share=root`,
    imageUrl: shareOgImageUrl({ kind: "root", root: decoded, locale }),
    locale,
  });
  return {
    title,
    description,
    ...social,
  };
}

export default async function RootPage({ params }: Props) {
  const { locale, root } = await params;
  const decoded = decodeURIComponent(root);
  const t = await getTranslations("Roots");
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const entry = await getRootEntry(decoded);
  if (!entry) notFound();

  const [mushaf, senseFile] = await Promise.all([
    getMushafIndex(),
    getLemmaSenseFile(),
  ]);

  const pageOf: Record<string, number> = {};
  for (const occ of entry.occurrences) {
    const key = `${occ.surahId}:${occ.verse}`;
    if (pageOf[key]) continue;
    const pages = mushaf.surahPages?.[String(occ.surahId)] ?? [];
    let page = mushaf.surahFirstPage?.[String(occ.surahId)] ?? 1;
    for (const p of pages) {
      const verses = mushaf.pages?.[String(p)] ?? [];
      if (
        verses.some(
          (v) => v.surahId === occ.surahId && v.verseNumber === occ.verse,
        )
      ) {
        page = p;
        break;
      }
    }
    pageOf[key] = page;
  }

  const lemmas = summarizeRootLemmas(entry, senseFile?.senses);

  return (
    <ArabyaHubPage className="root-page">
      <ArabyaHubHero
        icon="roots"
        iconLabel={entry.root}
        title={t("rootTitle", { root: entry.root })}
        lead={t("occurrences", { count: formatCount(entry.count, locale) })}
        nav={[
          { href: "/roots", label: t("backRoots") },
          { href: "/mushaf/1", label: th("items.mushaf.title") },
          { href: "/", label: th("backHome") },
        ]}
        actions={
          <PageShareButton
            title={t("shareTitle", { root: entry.root })}
            text={t("shareText", {
              root: entry.root,
              count: formatCount(entry.count, locale),
            })}
            path={`/root/${encodeURIComponent(entry.root)}?share=root`}
            kind="root"
            label={t("shareLabel")}
            hint={t("shareHint")}
          />
        }
      />

      {lemmas.length ? (
        <section className="root-lemmas" aria-labelledby="root-lemmas-h">
          <h2 id="root-lemmas-h">{t("lemmasTitle")}</h2>
          <p className="root-lemmas-lead">{t("lemmasLead")}</p>
          <ul className="root-lemma-list">
            {lemmas.slice(0, 40).map((L) => (
              <li key={L.lemma}>
                <span className="root-lemma-form">{L.lemma}</span>
                <span className="root-lemma-count">
                  {formatCount(L.count, locale)}
                </span>
                {L.sense ? (
                  <span className="root-lemma-sense">
                    {L.sense}
                    {L.senseSource ? (
                      <span className="root-lemma-src"> · {L.senseSource}</span>
                    ) : null}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
          {lemmas.length > 40 ? (
            <p className="root-lemmas-more">
              {t("lemmasMore", {
                count: formatCount(lemmas.length - 40, locale),
              })}
            </p>
          ) : null}
        </section>
      ) : null}

      <section aria-labelledby="root-occ-h">
        <h2 id="root-occ-h">{t("occTitle")}</h2>
        <RootOccurrencesList
          root={entry.root}
          occurrences={entry.occurrences}
          pageOf={pageOf}
        />
      </section>
    </ArabyaHubPage>
  );
}
