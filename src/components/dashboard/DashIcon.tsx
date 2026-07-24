/** Inline SVG icons for dashboards — no emoji, teal-friendly. */
export type DashIconName =
  | "home"
  | "favorites"
  | "upgrade"
  | "studio"
  | "queue"
  | "sources"
  | "stats"
  | "users"
  | "requests"
  | "audit"
  | "settings"
  | "back"
  | "spark"
  | "shield"
  | "book"
  | "cloud";

const paths: Record<DashIconName, string> = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z",
  favorites:
    "M19.5 12.6 12 20l-7.5-7.4A5 5 0 0 1 12 5a5 5 0 0 1 7.5 7.6Z",
  upgrade: "M12 3v12m0-12 4 4m-4-4-4 4M5 21h14",
  studio: "M4 19h16M6 17V9l6-4 6 4v8",
  queue: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  sources: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4v15.5M8 4h12v13H8z",
  stats: "M4 19V9m6 10V5m6 14v-7m6 7V3",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  requests: "M14 2H6a2 2 0 0 0-2 2v16l4-2 4 2 4-2 4 2V8l-6-6Zm0 0v6h6",
  audit: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-6 9 2 2 4-4",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8.4-3a7.8 7.8 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.7-1l-.3-2.6H9.1l-.3 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.5 2 1.5a7.8 7.8 0 0 0-.1 1c0 .3 0 .7.1 1l-2 1.5 2 3.5 2.4-1a8 8 0 0 0 1.7 1l.3 2.6h5.8l.3-2.6a8 8 0 0 0 1.7-1l2.4 1 2-3.5-2-1.5c.1-.3.1-.7.1-1Z",
  back: "M19 12H5m0 0 6 6m-6-6 6-6",
  spark: "M12 2l1.5 6.5L20 10l-6.5 1.5L12 18l-1.5-6.5L4 10l6.5-1.5L12 2Z",
  shield: "M12 3 4 7v5c0 5 3.5 8.5 8 9.5 4.5-1 8-4.5 8-9.5V7l-8-4Z",
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z",
  cloud: "M17.5 19a4.5 4.5 0 0 0 .5-9 7 7 0 0 0-13.2 2A4 4 0 0 0 6 19h11.5Z",
};

export function DashIcon({
  name,
  className = "",
}: {
  name: DashIconName;
  className?: string;
}) {
  return (
    <svg
      className={`dash-icon ${className}`}
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={paths[name]} />
    </svg>
  );
}
