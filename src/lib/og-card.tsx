import { ImageResponse } from "next/og";
import { OG_IMAGE_SIZE } from "@/lib/og-meta";

export type OgCardContent = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ayahLine?: string;
  footer?: string;
};

/** Build-safe Latin card — used by static opengraph-image routes in CI. */
export function renderOgCardLatin(opts: OgCardContent) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 56,
          background:
            "linear-gradient(145deg, #0f766e 0%, #134e4a 48%, #0b1412 100%)",
          color: "#ecfdf5",
          fontFamily: "Georgia, 'Times New Roman', serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: 28, opacity: 0.8 }}>arabyaai.com</div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>Arabya</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {opts.eyebrow ? (
            <div style={{ fontSize: 26, opacity: 0.85 }}>{opts.eyebrow}</div>
          ) : null}
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.2 }}>
            {opts.title}
          </div>
          {opts.subtitle ? (
            <div style={{ fontSize: 28, opacity: 0.9 }}>{opts.subtitle}</div>
          ) : null}
        </div>
        <div style={{ fontSize: 22, opacity: 0.75 }}>
          {opts.footer ?? "Word-by-word Quran study"}
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE },
  );
}
