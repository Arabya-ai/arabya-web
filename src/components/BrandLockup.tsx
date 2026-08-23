"use client";

import { useLocale } from "next-intl";

/** Compact UI mark (~6 KB WebP). Keep full PNG for canvas/export. */
export const BRAND_MARK_UI_SRC = "/brand/arabya-mark-ui.webp";
export const BRAND_MARK_UI_FALLBACK_SRC = "/brand/arabya-mark-ui.png";

type BrandLockupProps = {
  size?: "header" | "footer";
};

export function BrandLockup({ size = "header" }: BrandLockupProps) {
  const locale = useLocale();
  const isHeader = size === "header";
  const logoSize = 46;
  const brandName = locale === "en" ? "Arabya" : "عربية";

  return (
    <span
      className={`brand-lockup ${isHeader ? "" : "brand-lockup--footer"}`}
    >
      <span className="brand-emblem" aria-hidden>
        <span className="brand-emblem-shadow" />
        <span className="brand-emblem-plate">
          <span className="brand-emblem-shine" />
          <picture>
            <source srcSet={BRAND_MARK_UI_SRC} type="image/webp" />
            <img
              src={BRAND_MARK_UI_FALLBACK_SRC}
              alt=""
              width={logoSize}
              height={logoSize}
              className="brand-logo"
              decoding="async"
              fetchPriority={isHeader ? "high" : "auto"}
            />
          </picture>
        </span>
      </span>

      <span className="brand-text">
        <span className="brand-name" data-text={brandName}>
          {brandName}
        </span>
      </span>
    </span>
  );
}
