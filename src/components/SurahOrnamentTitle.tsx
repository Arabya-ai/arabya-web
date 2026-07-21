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

  return (
    <Tag className={`surah-ornament ${className}`.trim()}>
      <span className="surah-ornament-wing" aria-hidden />
      <span className="surah-ornament-plaque">
        <span className="surah-ornament-text">{title}</span>
      </span>
      <span className="surah-ornament-wing" aria-hidden />
    </Tag>
  );
}
