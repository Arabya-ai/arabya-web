"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  isFavoriteReciter,
  toggleFavoriteReciter,
} from "@/lib/favorite-reciters";

export function FavoriteReciterButton({ reciterId }: { reciterId: string }) {
  const t = useTranslations("Reciters");
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(isFavoriteReciter(reciterId));
  }, [reciterId]);

  return (
    <button
      type="button"
      className="nav-pill reciter-fav-btn"
      aria-pressed={active}
      onClick={() => {
        const next = toggleFavoriteReciter(reciterId);
        setActive(next.includes(reciterId));
      }}
    >
      {active ? t("unfavorite") : t("favorite")}
    </button>
  );
}
