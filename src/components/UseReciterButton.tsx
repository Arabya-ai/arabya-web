"use client";

import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { STORAGE_KEYS } from "@/lib/storage-keys";
import { getMushafPageHref } from "@/lib/format";

export function UseReciterButton({
  reciterId,
  mushafPage = 1,
}: {
  reciterId: string;
  mushafPage?: number;
}) {
  const t = useTranslations("Reciters");
  const router = useRouter();

  return (
    <button
      type="button"
      className="nav-pill reciter-use-btn"
      onClick={() => {
        try {
          localStorage.setItem(STORAGE_KEYS.reciter, reciterId);
        } catch {
          /* ignore */
        }
        router.push(getMushafPageHref(mushafPage));
      }}
    >
      {t("useInMushaf")}
    </button>
  );
}
