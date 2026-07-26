"use client";

import Image from "next/image";
import { useLocale } from "next-intl";

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
          <Image
            src="/brand/arabya-mark-square.png"
            alt=""
            width={logoSize}
            height={logoSize}
            className="brand-logo"
            priority={isHeader}
            unoptimized
          />
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
