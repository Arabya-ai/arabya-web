import Image from "next/image";

type BrandLockupProps = {
  size?: "header" | "footer";
};

/** Single React text node (hydration-safe). Depth/motion via CSS only. */
export function BrandLockup({ size = "header" }: BrandLockupProps) {
  const isHeader = size === "header";
  const logoSize = isHeader ? 46 : 40;

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
        <span className="brand-name" data-text="عربية">
          عربية
        </span>
      </span>
    </span>
  );
}
