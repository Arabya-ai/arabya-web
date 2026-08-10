"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ReciterCatalogEntry } from "@/lib/reciters-catalog";
import { ReciterAvatar } from "@/components/ReciterAvatar";

export function RecitersCatalogClient({
  reciters,
}: {
  reciters: ReciterCatalogEntry[];
}) {
  const t = useTranslations("Reciters");
  const locale = useLocale();
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return reciters;
    return reciters.filter((r) => {
      const hay = [
        r.id,
        r.nameAr,
        r.nameEn,
        r.style ?? "",
        r.meta.riwayaAr ?? "",
        r.meta.riwayaEn ?? "",
        r.meta.countryAr ?? "",
        r.meta.countryEn ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [q, reciters]);

  return (
    <div className="reciters-catalog">
      <input
        type="search"
        className="library-archive-filter"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("searchPlaceholder")}
        aria-label={t("searchAria")}
      />
      {filtered.length === 0 ? (
        <p className="empty-state">{t("emptySearch")}</p>
      ) : (
        <ul className="reciters-grid">
          {filtered.map((r) => {
            const name = locale === "en" ? r.nameEn : r.nameAr;
            const riwaya =
              locale === "en"
                ? r.meta.riwayaEn || r.meta.riwayaAr
                : r.meta.riwayaAr || r.meta.riwayaEn;
            const country =
              locale === "en"
                ? r.meta.countryEn || r.meta.countryAr
                : r.meta.countryAr || r.meta.countryEn;
            return (
              <li key={r.id}>
                <Link href={`/reciters/${r.id}`} className="reciters-grid-link">
                  <ReciterAvatar name={name} imageUrl={r.meta.imageUrl} size={52} />
                  <span className="reciters-grid-body">
                    <span className="reciters-grid-name">{name}</span>
                    {r.style ? (
                      <span className="reciters-grid-style">{r.style}</span>
                    ) : null}
                    {riwaya ? (
                      <span className="reciters-grid-meta">{riwaya}</span>
                    ) : null}
                    {country ? (
                      <span className="reciters-grid-meta">{country}</span>
                    ) : null}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
