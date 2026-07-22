import { ImageResponse } from "next/og";
import { OG_IMAGE_SIZE } from "@/lib/og-meta";

/**
 * Satori (next/og) still crashes on many Arabic fonts/glyphs in CI/Linux
 * (lookupType 5 / substFormat 3). Keep card text Latin-script until upstream
 * RTL shaping is stable; page <title>/description may stay Arabic.
 */
export function renderOgCard(opts: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  footer?: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
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
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 28, opacity: 0.8 }}>arabyaai.com</div>
          <div style={{ fontSize: 40, fontWeight: 700 }}>Arabya</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: "100%",
          }}
        >
          {opts.eyebrow ? (
            <div style={{ fontSize: 26, opacity: 0.85 }}>{opts.eyebrow}</div>
          ) : null}
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              lineHeight: 1.15,
              maxWidth: "100%",
            }}
          >
            {opts.title}
          </div>
          {opts.subtitle ? (
            <div style={{ fontSize: 30, opacity: 0.9, lineHeight: 1.4 }}>
              {opts.subtitle}
            </div>
          ) : null}
        </div>

        <div style={{ fontSize: 24, opacity: 0.75 }}>
          {opts.footer ?? "Word-by-word Quran study"}
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE },
  );
}
