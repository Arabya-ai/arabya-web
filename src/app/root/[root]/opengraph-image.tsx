import { ImageResponse } from "next/og";
import { getRootEntry } from "@/lib/quran";
import { toArabicNumerals } from "@/lib/format";
import { OG_IMAGE_SIZE } from "@/lib/og-meta";

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "Arabya — جذر قرآني";

type Props = { params: Promise<{ root: string }> };

export default async function RootOgImage({ params }: Props) {
  const { root } = await params;
  const decoded = decodeURIComponent(root);
  let title = `الجذر ${decoded}`;
  let subtitle = "مواضع في القرآن — Arabya";

  try {
    const entry = await getRootEntry(decoded);
    if (entry) {
      title = `الجذر ${entry.root}`;
      subtitle = `${toArabicNumerals(entry.count)} موضعًا في القرآن`;
    }
  } catch {
    /* defaults */
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "flex-end",
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
            alignItems: "flex-end",
            gap: 16,
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              direction: "rtl",
              textAlign: "right",
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: 32, opacity: 0.9, direction: "rtl" }}>
            {subtitle}
          </div>
        </div>
        <div style={{ fontSize: 24, opacity: 0.75, direction: "rtl" }}>
          دراسة الجذور والمشتقات
        </div>
      </div>
    ),
    { ...size },
  );
}
