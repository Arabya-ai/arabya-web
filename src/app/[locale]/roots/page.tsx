import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import { getRootsIndex } from "@/lib/quran";
import { formatCount } from "@/lib/format";
import { topRootsByCount } from "@/lib/roots";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Roots" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

function firstLetter(root: string): string {
  return root.trim().charAt(0) || "#";
}

export default async function RootsIndexPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Roots" });
  const th = await getTranslations({ locale, namespace: "ServicesHub" });
  const index = await getRootsIndex();
  const roots = index?.roots ?? [];
  const top = topRootsByCount(roots, 40);

  const byLetter = new Map<string, { root: string; count: number }[]>();
  for (const r of roots) {
    const letter = firstLetter(r.root);
    const list = byLetter.get(letter) ?? [];
    list.push({ root: r.root, count: r.count });
    byLetter.set(letter, list);
  }

  const letters = [...byLetter.keys()].sort((a, b) => a.localeCompare(b, "ar"));

  return (
    <ArabyaHubPage className="roots-index-page">
      <ArabyaHubHero
        icon="roots"
        iconLabel={t("title")}
        title={t("title")}
        lead={t("intro", { count: formatCount(roots.length, locale) })}
        nav={[
          { href: "/", label: th("backHome") },
          { href: "/study", label: th("items.study.title") },
          { href: "/services", label: th("viewAll") },
        ]}
      />

      {top.length ? (
        <section className="roots-top-section" aria-labelledby="roots-top-h">
          <h2 id="roots-top-h">{t("topTitle")}</h2>
          <p className="roots-top-lead">{t("topLead")}</p>
          <ol className="roots-top-list">
            {top.map((r, i) => (
              <li key={r.root}>
                <Link href={`/root/${encodeURIComponent(r.root)}`}>
                  <span className="roots-top-rank">
                    {formatCount(i + 1, locale)}
                  </span>
                  <span className="roots-grid-root">{r.root}</span>
                  <span className="roots-grid-count">
                    {formatCount(r.count, locale)}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <nav className="roots-letter-nav" aria-label={t("lettersAria")}>
        {letters.map((l) => (
          <a key={l} href={`#letter-${l}`} className="roots-letter-chip">
            {l}
          </a>
        ))}
      </nav>

      {letters.map((letter) => {
        const list = byLetter.get(letter) ?? [];
        return (
          <section
            key={letter}
            id={`letter-${letter}`}
            className="roots-letter-section"
            aria-labelledby={`h-letter-${letter}`}
          >
            <h2 id={`h-letter-${letter}`}>{letter}</h2>
            <ul className="roots-grid">
              {list.map((r) => (
                <li key={r.root}>
                  <Link href={`/root/${encodeURIComponent(r.root)}`}>
                    <span className="roots-grid-root">{r.root}</span>
                    <span className="roots-grid-count">
                      {formatCount(r.count, locale)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </ArabyaHubPage>
  );
}
