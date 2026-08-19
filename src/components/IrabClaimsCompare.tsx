import type { IrabClaim } from "@/lib/claims";
import { claimsHaveAlternates } from "@/lib/claims";

type Props = {
  claims: IrabClaim[];
  locale: "ar" | "en";
  /** When true, show all sources stacked (ayah editorial view). */
  expanded?: boolean;
};

export function IrabClaimsCompare({
  claims,
  locale,
  expanded = false,
}: Props) {
  if (!claims.length) return null;

  if (expanded && claimsHaveAlternates(claims)) {
    return (
      <ul className="irab-claims-stack" dir={locale === "en" ? "ltr" : "rtl"}>
        {claims.map((c) => (
          <li key={c.id} className="irab-claims-stack__item">
            <span className="irab-claims-stack__source">{c.sourceLabel}</span>
            <p className="irab-claims-stack__text">{c.text}</p>
            {c.evidence && c.evidence !== c.text ? (
              <p className="irab-claims-stack__evidence">{c.evidence}</p>
            ) : null}
          </li>
        ))}
      </ul>
    );
  }

  return (
    <p className="irab-claims-primary" dir={locale === "en" ? "ltr" : "rtl"}>
      {claims[0]?.text}
    </p>
  );
}
