"use client";
import { cn } from "@/ayat-studio/lib/utils";

/** Animated background of subtle Islamic-pattern tiles + gold aurora orbs */
export function IslamicBackdrop({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 pattern-stars opacity-40" />
      <div
        className="aurora-orb h-[420px] w-[420px] -top-32 -right-32"
        style={{ background: "hsl(178 70% 30% / 0.28)" }}
      />
      <div
        className="aurora-orb h-[360px] w-[360px] top-1/3 -left-40"
        style={{
          background: "hsl(41 75% 50% / 0.22)",
          animationDelay: "-7s",
        }}
      />
      <div
        className="aurora-orb h-[300px] w-[300px] bottom-0 right-1/4"
        style={{
          background: "hsl(195 60% 25% / 0.25)",
          animationDelay: "-14s",
        }}
      />
    </div>
  );
}

type MarkProps = {
  className?: string;
  size?: number;
  /** Soft pulse — for hero accents only */
  glow?: boolean;
};

/**
 * Professional Arabya mark icon (replaces star/arabesque medallions).
 * Uses the official square brand asset with a light plate treatment.
 */
export function ArabyaMarkIcon({
  className,
  size = 64,
  glow = false,
}: MarkProps) {
  const src =
    size <= 128
      ? "/brand/arabya-mark-ui.webp"
      : "/brand/arabya-mark-square.png";

  return (
    <span
      className={cn(
        "arabya-mark-icon relative inline-flex shrink-0 items-center justify-center",
        glow && "animate-pulse-glow",
        className,
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        className="arabya-mark-icon__img relative z-[1] h-full w-full select-none object-cover"
        draggable={false}
        decoding="async"
      />
    </span>
  );
}

/** @deprecated Prefer ArabyaMarkIcon — kept as alias so existing pages swap cleanly */
export function ArabesqueMedallion({
  className,
  size = 80,
}: {
  className?: string;
  size?: number;
}) {
  const wantsGlow = Boolean(className?.includes("animate-pulse-glow"));
  const cleaned = className
    ?.replace(/\banimate-pulse-glow\b/g, "")
    .replace(/\bgroup-hover:rotate-45\b/g, "")
    .replace(/\btransition-transform\b/g, "")
    .replace(/\bduration-\d+\b/g, "")
    .trim();

  return (
    <ArabyaMarkIcon
      size={size}
      glow={wantsGlow}
      className={cleaned || undefined}
    />
  );
}

/** Decorative ornament — used as section divider */
export function OrnamentDivider({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center gap-3 py-6",
        className,
      )}
      aria-hidden
    >
      <span className="h-px max-w-[120px] flex-1 bg-gradient-to-l from-transparent via-accent/40 to-transparent" />
      <ArabyaMarkIcon size={22} className="opacity-80" />
      <span className="h-px max-w-[120px] flex-1 bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
    </div>
  );
}

/** Small Arabya mark — for inline badges */
export function StarOrnament({ className }: { className?: string }) {
  return (
    <ArabyaMarkIcon
      size={14}
      className={cn("opacity-90", className)}
    />
  );
}
