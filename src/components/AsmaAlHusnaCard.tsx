"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toArabicNumerals } from "@/lib/format";

type AsmaName = {
  number: number;
  nameAr: string;
  transliteration: string;
  meaningAr: string;
  meaningEn: string;
};

export function AsmaAlHusnaCard() {
  const [today, setToday] = useState<AsmaName | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/asma-al-husna");
        const data = (await res.json()) as {
          today?: AsmaName;
          error?: string;
        };
        if (!res.ok || !data.today) {
          if (!cancelled) setError("تعذّر جلب الأسماء الحسنى");
          return;
        }
        if (!cancelled) setToday(data.today);
      } catch {
        if (!cancelled) setError("تعذّر الاتصال بخدمة الأسماء الحسنى");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="asma-panel" aria-labelledby="asma-h">
      <header className="asma-panel-head">
        <div>
          <h2 id="asma-h">الأسماء الحسنى</h2>
        </div>
        <Link href="/asma" className="nav-pill">
          عرض الكل
        </Link>
      </header>

      {error ? <p className="prayer-status prayer-status--err">{error}</p> : null}

      {today ? (
        <Link href={`/asma/${today.number}`} className="asma-today asma-today-link">
          <p className="asma-number">{toArabicNumerals(today.number)}</p>
          <p className="asma-name">{today.nameAr}</p>
          <p className="asma-trans">{today.transliteration}</p>
          {today.meaningAr ? (
            <p className="asma-meaning">{today.meaningAr}</p>
          ) : today.meaningEn ? (
            <p className="asma-meaning">{today.meaningEn}</p>
          ) : null}
        </Link>
      ) : !error ? (
        <p className="prayer-status">جاري التحميل…</p>
      ) : null}
    </section>
  );
}
