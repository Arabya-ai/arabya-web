"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { STUDY_QUERY_KEY } from "@/components/StudyVerseButton";

/** Legacy `/#study-h` → dedicated `/study` page (hides portal sections). */
export function StudyHashRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#study-h") return;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q && q.trim().length >= 2) {
      try {
        sessionStorage.setItem(STUDY_QUERY_KEY, q.trim());
      } catch {
        /* ignore */
      }
    }
    router.replace("/study");
  }, [router]);

  return null;
}
