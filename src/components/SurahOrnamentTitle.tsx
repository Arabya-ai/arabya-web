"use client";

import { useEffect, useState } from "react";

type SurahOrnamentTitleProps = {
  title: string;
  as?: "h1" | "h2";
  className?: string;
};

/** Decorative surah title bar — Uthmani text, teal wings, cream plaque. */
export function SurahOrnamentTitle({
  title,
  as = "h1",
  className = "",
}: SurahOrnamentTitleProps) {
  const Tag = as;
  const [textured, setTextured] = useState(false);

  useEffect(() => {
    // Defer wing pattern image so it cannot become the LCP candidate.
    const enable = () => setTextured(true);
    if (typeof requestIdleCallback !== "undefined") {
      const id = requestIdleCallback(enable, { timeout: 1800 });
      return () => cancelIdleCallback(id);
    }
    const t = window.setTimeout(enable, 1);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <Tag
      className={`surah-ornament${textured ? " surah-ornament--textured" : ""} ${className}`.trim()}
    >
      <span className="surah-ornament-wing" aria-hidden />
      <span className="surah-ornament-plaque">
        <span className="surah-ornament-text">{title}</span>
      </span>
      <span className="surah-ornament-wing" aria-hidden />
    </Tag>
  );
}
