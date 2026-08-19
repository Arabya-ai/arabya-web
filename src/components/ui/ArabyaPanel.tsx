import type { HTMLAttributes, ReactNode } from "react";

type PanelTag = "section" | "article" | "div";

type ArabyaPanelProps = Omit<HTMLAttributes<HTMLElement>, "title"> & {
  accent?: boolean;
  /** Adds `.dash-card` hover/animation inside dashboard shells. */
  legacyDash?: boolean;
  title?: ReactNode;
  titleId?: string;
  muted?: ReactNode;
  children?: ReactNode;
  as?: PanelTag;
};

function panelClasses(accent: boolean, legacyDash: boolean, className: string) {
  return [
    "arabya-panel",
    accent ? "arabya-panel--accent" : "",
    legacyDash ? "dash-card" : "",
    legacyDash && accent ? "dash-card--accent" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Shared panel primitive — maps to `.arabya-panel` tokens (account/admin/studio).
 */
export function ArabyaPanel({
  accent = false,
  legacyDash = false,
  title,
  titleId,
  muted,
  children,
  as: Tag = "section",
  className = "",
  ...rest
}: ArabyaPanelProps) {
  return (
    <Tag className={panelClasses(accent, legacyDash, className)} {...rest}>
      {title ? (
        <h2 id={titleId} className="arabya-panel__title">
          {title}
        </h2>
      ) : null}
      {muted ? <p className="arabya-panel__muted">{muted}</p> : null}
      {children}
    </Tag>
  );
}

export function ArabyaPanelStack({
  children,
  className = "",
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={["arabya-panel-stack", className].filter(Boolean).join(" ")} {...rest}>
      {children}
    </div>
  );
}
