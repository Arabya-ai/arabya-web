export function MushafToolIcon({
  name,
}: {
  name:
    | "study"
    | "irab"
    | "root"
    | "listen"
    | "bookmark"
    | "share"
    | "words"
    | "ayah"
    | "surah";
}) {
  const paths: Record<string, string> = {
    study:
      "M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v15H6.5A2.5 2.5 0 0 0 4 19.5V4.5A2.5 2.5 0 0 1 6.5 2Z",
    irab: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M8 13h8M8 17h5",
    root: "M12 22V8M12 8c0-3 2-5 5-5M12 8c0-3-2-5-5-5M7 14c2 0 4 1 5 3 1-2 3-3 5-3",
    listen:
      "M11 5 6 9H2v6h4l5 4V5Zm7.07 1.93a8 8 0 0 1 0 10.14M15.54 8.46a5 5 0 0 1 0 7.07",
    bookmark: "M19 21 12 16 5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z",
    share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13",
    words: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    ayah: "M5 3l14 9-14 9V3z",
    surah:
      "M9 18V5l12-2v13M6 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm12-2a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  };
  return (
    <svg
      className="mtb-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
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
