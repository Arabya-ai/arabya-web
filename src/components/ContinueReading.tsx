"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";

const LAST_PAGE_KEY = "arabya-last-mushaf-page";

export function ContinueReading() {
  const [page, setPage] = useState<number | null>(null);

  useEffect(() => {
    try {
      const raw = Number(localStorage.getItem(LAST_PAGE_KEY));
      if (Number.isInteger(raw) && raw >= 1 && raw <= 604) setPage(raw);
    } catch {
      /* ignore */
    }
  }, []);

  if (!page) return null;

  return (
    <p className="continue-reading">
      <Link href={getMushafPageHref(page)} className="continue-link">
        متابعة القراءة من الصفحة {toArabicNumerals(page)}
      </Link>
    </p>
  );
}
