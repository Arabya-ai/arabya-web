import type { Metadata } from "next";
import Link from "next/link";
import { toArabicNumerals } from "@/lib/format";

export const metadata: Metadata = {
  title: "الأسماء الحسنى",
  description: "أسماء الله الحسنى التسعة والتسعون — عربية",
};

type AsmaName = {
  number: number;
  name: string;
  transliteration: string;
  meaningEn: string;
};

async function loadNames(): Promise<AsmaName[]> {
  try {
    const res = await fetch("https://api.islamic.app/v1/asma-al-husna", {
      next: { revalidate: 86400 * 7 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const payload = (await res.json()) as {
      data?: {
        number?: number;
        name?: string;
        transliteration?: string;
        en?: { meaning?: string } | string;
      }[];
    };
    return (payload.data ?? [])
      .map((r) => ({
        number: Number(r.number) || 0,
        name: String(r.name ?? ""),
        transliteration: String(r.transliteration ?? ""),
        meaningEn:
          typeof r.en === "string" ? r.en : String(r.en?.meaning ?? ""),
      }))
      .filter((r) => r.number >= 1 && r.name);
  } catch {
    return [];
  }
}

export default async function AsmaPage() {
  const names = await loadNames();

  return (
    <div className="shell page-block asma-page">
      <nav className="surah-nav" aria-label="تنقل">
        <Link href="/" className="nav-pill">
          ← الفهرس
        </Link>
      </nav>

      <header className="asma-page-head">
        <h1>الأسماء الحسنى</h1>
        <p>
          {toArabicNumerals(names.length || 99)} اسمًا — مصدر البيانات:
          islamic.app
        </p>
      </header>

      {names.length === 0 ? (
        <p className="empty-state">تعذّر تحميل القائمة حاليًا.</p>
      ) : (
        <ul className="asma-grid">
          {names.map((n) => (
            <li key={n.number}>
              <span className="asma-grid-num">
                {toArabicNumerals(n.number)}
              </span>
              <span className="asma-grid-name">{n.name}</span>
              <span className="asma-grid-trans">{n.transliteration}</span>
              {n.meaningEn ? (
                <span className="asma-grid-meaning">{n.meaningEn}</span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
