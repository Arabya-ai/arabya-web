"use client";

import { useState } from "react";

/** Profile photo when available; otherwise branded initials (no external asset). */
export function ReciterAvatar({
  name,
  imageUrl,
  size = 56,
}: {
  name: string;
  imageUrl?: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  const initials = name
    .replace(/[()·.].*/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");

  if (imageUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote CDN stills; avoid Image optimizer lock-in
      <img
        src={imageUrl}
        alt=""
        width={size}
        height={size}
        className="reciter-avatar-img"
        loading="lazy"
        decoding="async"
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className="reciter-avatar-fallback"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden
    >
      {initials || "ق"}
    </span>
  );
}
