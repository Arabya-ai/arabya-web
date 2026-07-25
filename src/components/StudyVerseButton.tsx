"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";

import { STORAGE_KEYS } from "@/lib/storage-keys";

export const STUDY_QUERY_KEY = STORAGE_KEYS.studyQuery;

type Props = {
  verseText: string;
  className?: string;
};

/** Sends ayah text to the dedicated Quick Study page. */
export function StudyVerseButton({ verseText, className = "nav-pill" }: Props) {
  const router = useRouter();
  const t = useTranslations("Mushaf.studyVerse");

  const onStudy = () => {
    const text = verseText.trim();
    if (text.length < 2) return;
    try {
      sessionStorage.setItem(STUDY_QUERY_KEY, text);
    } catch {
      /* ignore quota */
    }
    router.push("/study");
  };

  return (
    <button
      type="button"
      className={className}
      onClick={onStudy}
      title={t("title")}
    >
      {t("label")}
    </button>
  );
}
