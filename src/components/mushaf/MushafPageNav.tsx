"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getMushafPageHref } from "@/lib/format";

type Props = {
  prev: number | null;
  next: number | null;
};

export function MushafPageNav({ prev, next }: Props) {
  const t = useTranslations("Nav");
  return (
    <nav className="surah-nav" aria-label={t("pageFlip")}>
      {prev ? (
        <Link href={getMushafPageHref(prev)} className="nav-pill">
          {t("prevPage")}
        </Link>
      ) : (
        <span />
      )}
      <Link href="/" className="nav-pill">
        {t("index")}
      </Link>
      {next ? (
        <Link href={getMushafPageHref(next)} className="nav-pill">
          {t("nextPage")}
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
