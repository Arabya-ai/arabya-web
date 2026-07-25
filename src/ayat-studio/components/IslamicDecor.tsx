"use client";
import { cn } from "@/ayat-studio/lib/utils";

/** Animated background of subtle Islamic-pattern tiles + gold aurora orbs */
export function IslamicBackdrop({ className }: { className?: string }) {
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      <div className="absolute inset-0 pattern-stars opacity-60" />
      <div className="aurora-orb h-[420px] w-[420px] -top-32 -right-32" style={{ background: "hsl(178 70% 30% / 0.45)" }} />
      <div className="aurora-orb h-[360px] w-[360px] top-1/3 -left-40" style={{ background: "hsl(41 75% 50% / 0.35)", animationDelay: "-7s" }} />
      <div className="aurora-orb h-[300px] w-[300px] bottom-0 right-1/4" style={{ background: "hsl(195 60% 25% / 0.4)", animationDelay: "-14s" }} />
    </div>
  );
}

/** Hand-styled SVG arabesque medallion */
export function ArabesqueMedallion({ className, size = 80 }: { className?: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={cn("text-accent", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.6"
      aria-hidden
    >
      <circle cx="50" cy="50" r="48" opacity="0.4" />
      <circle cx="50" cy="50" r="36" opacity="0.5" />
      <circle cx="50" cy="50" r="22" opacity="0.6" />
      {/* 8-point star */}
      <path d="M50 14 L58 32 L78 32 L62 44 L68 64 L50 52 L32 64 L38 44 L22 32 L42 32 Z" opacity="0.7" />
      {/* Inner rotated star */}
      <g transform="rotate(22.5 50 50)">
        <path d="M50 26 L55 38 L68 38 L58 46 L62 58 L50 50 L38 58 L42 46 L32 38 L45 38 Z" opacity="0.5" />
      </g>
      <circle cx="50" cy="50" r="3" fill="currentColor" opacity="0.8" stroke="none" />
    </svg>
  );
}

/** Decorative ornament — used as section divider */
export function OrnamentDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-3 py-6", className)} aria-hidden>
      <span className="h-px flex-1 max-w-[120px] bg-gradient-to-l from-transparent via-accent/40 to-transparent" />
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent/60" fill="currentColor">
        <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
      </svg>
      <ArabesqueMedallion size={28} className="text-accent/70" />
      <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent/60" fill="currentColor">
        <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" />
      </svg>
      <span className="h-px flex-1 max-w-[120px] bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
    </div>
  );
}

/** Small star ornament — for inline use */
export function StarOrnament({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("h-4 w-4", className)} fill="currentColor" aria-hidden>
      <path d="M12 1 L14 9 L22 11 L14 13 L12 21 L10 13 L2 11 L10 9 Z" />
    </svg>
  );
}
