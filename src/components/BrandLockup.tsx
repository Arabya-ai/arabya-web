import Image from "next/image";

type BrandLockupProps = {
  size?: "header" | "footer";
};

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
        <span className="brand-name">
          <span className="brand-name-depth" aria-hidden>
            عربية
          </span>
          <span className="brand-name-mid" aria-hidden>
            عربية
          </span>
          <span className="brand-name-face">عربية</span>
          <span className="brand-name-sheen" aria-hidden />
        </span>
      </span>
    </span>
  );
}
