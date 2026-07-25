"use client";

import { Link } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";

import { STORAGE_KEYS } from "@/lib/storage-keys";

const LAST_PAGE_KEY = STORAGE_KEYS.lastMushafPage;

export function ContinueReading() {
  const t = useTranslations("Home");
  const locale = useLocale();
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

  const pageLabel =
    locale === "ar" ? toArabicNumerals(page) : String(page);

  return (
    <p className="continue-reading">
      <Link href={getMushafPageHref(page)} className="continue-link">
        {t("continueReading", { page: pageLabel })}
      </Link>
    </p>
  );
}
