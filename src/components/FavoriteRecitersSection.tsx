"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { readFavoriteReciters, writeFavoriteReciters } from "@/lib/favorite-reciters";
import { RECITERS, reciterDisplayName } from "@/lib/audio";

export function FavoriteRecitersSection({
  mode = "full",
}: {
  mode?: "full" | "preview";
}) {
  const t = useTranslations("Favorites");
  const locale = useLocale();
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(readFavoriteReciters());
  }, []);

  const shown = mode === "preview" ? ids.slice(0, 5) : ids;
  const entries = shown
    .map((id) => RECITERS.find((r) => r.id === id))
    .filter((r): r is (typeof RECITERS)[number] => Boolean(r));

  function remove(id: string) {
    const next = readFavoriteReciters().filter((x) => x !== id);
    writeFavoriteReciters(next);
    setIds(next);
  }

  return (
    <section className="library-block" aria-labelledby="lib-reciters-h">
      <div className="library-block-head">
        <h2 id="lib-reciters-h">
          {t("recitersTitle")}{" "}
          <span className="library-count">({ids.length})</span>
        </h2>
        {mode === "preview" ? (
          <Link href="/reciters" className="account-panel-link">
            {t("openReciters")}
          </Link>
        ) : (
          <Link href="/reciters" className="account-panel-link">
            {t("openReciters")}
          </Link>
        )}
      </div>
      {entries.length ? (
        <ul className="library-list">
          {entries.map((r) => (
            <li key={r.id} className="library-row">
              <Link href={`/reciters/${r.id}`}>
                {reciterDisplayName(r, locale)}
              </Link>
              {mode === "full" ? (
                <button
                  type="button"
                  className="library-remove"
                  onClick={() => remove(r.id)}
                >
                  {t("remove")}
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="library-empty">{t("emptyReciters")}</p>
      )}
    </section>
  );
}
