"use client";

import { useRouter } from "next/navigation";

export const STUDY_QUERY_KEY = "arabya-study-query";

type Props = {
  verseText: string;
  className?: string;
};

/** Sends ayah text to home Quick Study and navigates there. */
export function StudyVerseButton({ verseText, className = "nav-pill" }: Props) {
  const router = useRouter();

  const onStudy = () => {
    const text = verseText.trim();
    if (text.length < 2) return;
    try {
      sessionStorage.setItem(STUDY_QUERY_KEY, text);
    } catch {
      /* ignore quota */
    }
    router.push("/#study-h");
  };

  return (
    <button
      type="button"
      className={className}
      onClick={onStudy}
      title="نسخ الآية إلى الدراسة السريعة"
    >
      دراسة
    </button>
  );
}
