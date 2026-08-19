import type { HTMLAttributes, ReactNode } from "react";

type ArabyaPanelProps = HTMLAttributes<HTMLElement> & {
  accent?: boolean;
  title?: ReactNode;
  muted?: ReactNode;
  children?: ReactNode;
};

/**
 * Shared panel primitive — maps to `.arabya-panel` tokens (account/admin/studio).
 */
export function ArabyaPanel({
  accent = false,
  title,
  muted,
  children,
  className = "",
  ...rest
}: ArabyaPanelProps) {
  const classes = ["arabya-panel", accent ? "arabya-panel--accent" : "", className]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={classes} {...rest}>
      {title ? <h2 className="arabya-panel__title">{title}</h2> : null}
      {muted ? <p className="arabya-panel__muted">{muted}</p> : null}
      {children}
    </section>
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
