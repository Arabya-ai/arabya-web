import Link from "next/link";
import type { Metadata } from "next";
import { getRootsIndex } from "@/lib/quran";
import { toArabicNumerals } from "@/lib/format";

export const metadata: Metadata = {
  title: "فهرس الجذور",
  description: "فهرس أبجدي لجذور كلمات القرآن — عربية",
};

function firstLetter(root: string): string {
  return root.trim().charAt(0) || "#";
}

export default async function RootsIndexPage() {
  const index = await getRootsIndex();
  const roots = index?.roots ?? [];

  const byLetter = new Map<string, { root: string; count: number }[]>();
  for (const r of roots) {
    const letter = firstLetter(r.root);
    const list = byLetter.get(letter) ?? [];
    list.push({ root: r.root, count: r.count });
    byLetter.set(letter, list);
  }

  const letters = [...byLetter.keys()].sort((a, b) => a.localeCompare(b, "ar"));

  return (
    <div className="shell page-block roots-index-page">
      <nav className="surah-nav" aria-label="تنقل">
        <Link href="/" className="nav-pill">
          ← الفهرس
        </Link>
      </nav>

      <header className="roots-index-head">
        <h1>فهرس الجذور الصرفية</h1>
        <p>
          {toArabicNumerals(roots.length)} جذرًا من المدونة القرآنية العربية
          (QAC)
        </p>
      </header>

      <nav className="roots-letter-nav" aria-label="حروف الجذور">
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
                      {toArabicNumerals(r.count)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
