import type { ArabyaServiceIcon } from "@/lib/arabya-services-catalog";

/** Lightweight SVG marks — animated by CSS 3D stage wrapper. */
function Glyph({ icon }: { icon: ArabyaServiceIcon }) {
  switch (icon) {
    case "mushaf":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <rect x="10" y="8" width="28" height="32" rx="3" fill="currentColor" opacity="0.95" />
          <rect x="15" y="14" width="18" height="2.5" rx="1" fill="#fff" opacity="0.85" />
          <rect x="15" y="21" width="18" height="2.5" rx="1" fill="#fff" opacity="0.85" />
          <rect x="15" y="28" width="12" height="2.5" rx="1" fill="#fff" opacity="0.85" />
        </svg>
      );
    case "juz":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <rect x="12" y="10" width="24" height="5" rx="2" fill="currentColor" />
          <rect x="12" y="20" width="24" height="5" rx="2" fill="currentColor" opacity="0.85" />
          <rect x="12" y="30" width="16" height="5" rx="2" fill="currentColor" opacity="0.7" />
        </svg>
      );
    case "roots":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <circle cx="24" cy="30" r="10" fill="currentColor" opacity="0.9" />
          <path
            d="M24 8v14M18 18c2 4 4 6 6 6s4-2 6-6"
            stroke="currentColor"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
      );
    case "qiraat":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <path
            d="M8 24c6-10 12-10 16 0s10 10 16 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <circle cx="24" cy="24" r="4" fill="currentColor" />
        </svg>
      );
    case "asma":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <path
            d="M24 8l4.2 9.2L38 20l-8 4.6L24 36l-4-11.4L12 20l9.8-2.8L24 8z"
            fill="currentColor"
          />
        </svg>
      );
    case "reciters":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <rect x="18" y="10" width="12" height="18" rx="6" fill="currentColor" />
          <path
            d="M14 24c0 6 4.5 11 10 11h0c5.5 0 10-5 10-11"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "adhkar":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <path
            d="M24 10c7 0 13 4.5 13 11 0 8-9 14-13 18-4-4-13-10-13-18 0-6.5 6-11 13-11z"
            fill="currentColor"
          />
          <circle cx="24" cy="22" r="4" fill="#fff" opacity="0.9" />
        </svg>
      );
    case "qibla":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <circle cx="24" cy="24" r="14" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M24 12l4 12-4 4-4-4 4-12z" fill="currentColor" />
        </svg>
      );
    case "tahfeez":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <rect x="12" y="12" width="24" height="24" rx="4" fill="currentColor" />
          <path d="M20 24l5 5 9-10" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "study":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <rect x="10" y="10" width="4" height="28" rx="1.5" fill="currentColor" />
          <rect x="18" y="12" width="20" height="4" rx="1.5" fill="currentColor" />
          <rect x="18" y="22" width="16" height="4" rx="1.5" fill="currentColor" opacity="0.85" />
          <rect x="18" y="32" width="18" height="4" rx="1.5" fill="currentColor" opacity="0.7" />
        </svg>
      );
    case "studio":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <rect x="8" y="14" width="22" height="20" rx="3" fill="currentColor" />
          <path d="M30 20l12 6-12 6V20z" fill="currentColor" opacity="0.9" />
        </svg>
      );
    case "library":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <rect x="10" y="10" width="8" height="28" rx="1.5" fill="currentColor" />
          <rect x="20" y="10" width="8" height="28" rx="1.5" fill="currentColor" opacity="0.85" />
          <rect x="30" y="12" width="8" height="26" rx="1.5" fill="currentColor" opacity="0.7" />
        </svg>
      );
    case "books":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <path
            d="M14 10h18a4 4 0 0 1 4 4v22H18a4 4 0 0 0-4 4V10z"
            fill="currentColor"
          />
        </svg>
      );
    case "hadith":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <rect x="12" y="10" width="24" height="8" rx="2" fill="currentColor" />
          <rect x="12" y="22" width="24" height="16" rx="2" fill="currentColor" opacity="0.85" />
        </svg>
      );
    case "heritage":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <path d="M10 36V22L24 10l14 12v14H28V24h-8v12H10z" fill="currentColor" />
        </svg>
      );
    case "resources":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <rect x="10" y="12" width="28" height="5" rx="2" fill="currentColor" />
          <rect x="10" y="22" width="28" height="5" rx="2" fill="currentColor" opacity="0.85" />
          <rect x="10" y="32" width="18" height="5" rx="2" fill="currentColor" opacity="0.7" />
          <path d="M34 30l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );
    case "lughawi":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <rect x="12" y="10" width="24" height="8" rx="2" fill="currentColor" />
          <rect x="12" y="22" width="24" height="8" rx="2" fill="currentColor" opacity="0.85" />
          <path d="M18 34l6 8 6-8H18z" fill="currentColor" opacity="0.75" />
        </svg>
      );
    case "tajweed":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <circle cx="14" cy="24" r="6" fill="currentColor" />
          <circle cx="24" cy="24" r="6" fill="currentColor" opacity="0.75" />
          <circle cx="34" cy="24" r="6" fill="currentColor" opacity="0.5" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <circle cx="22" cy="22" r="10" fill="none" stroke="currentColor" strokeWidth="3.5" />
          <path d="M30 30l10 10" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );
    case "nlp":
      return (
        <svg viewBox="0 0 48 48" width="28" height="28" aria-hidden>
          <rect x="10" y="12" width="28" height="24" rx="4" fill="currentColor" />
          <path
            d="M16 22h16M16 28h10"
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      );
    default:
      return null;
  }
}

export function ServiceIcon3D({
  icon,
  label,
}: {
  icon: ArabyaServiceIcon;
  label: string;
}) {
  return (
    <span className="svc-icon-3d" aria-hidden="true" title={label}>
      <span className="svc-icon-3d__stage">
        <span className="svc-icon-3d__face svc-icon-3d__face--back" />
        <span className="svc-icon-3d__face svc-icon-3d__face--front">
          <Glyph icon={icon} />
        </span>
      </span>
    </span>
  );
}
