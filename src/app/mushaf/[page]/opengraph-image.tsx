import { ImageResponse } from "next/og";
import { getMushafPage } from "@/lib/mushaf";
import { getSurahUthmaniTitle } from "@/lib/surah-names";
import { toArabicNumerals } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

type Props = { params: Promise<{ page: string }> };

export default async function OgImage({ params }: Props) {
  const { page } = await params;
  const pageNum = Number(page);
  let title = `صفحة ${page}`;
  let subtitle = "Arabya — دراسة كلمات القرآن";

  if (Number.isInteger(pageNum) && pageNum >= 1 && pageNum <= 604) {
    try {
      const content = await getMushafPage(pageNum);
      if (content) {
        title =
          content.blocks.length === 1
            ? getSurahUthmaniTitle(content.blocks[0].surahId)
            : "مصحف المدينة";
        subtitle = `صفحة ${toArabicNumerals(pageNum)} · Arabya`;
      }
    } catch {
      /* keep defaults */
    }
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-end",
          padding: 72,
          background:
            "linear-gradient(145deg, #0f766e 0%, #134e4a 55%, #0b1412 100%)",
          color: "#ecfdf5",
          fontFamily: "Georgia, serif",
        }}
      >
        <div style={{ fontSize: 42, opacity: 0.85, marginBottom: 18 }}>
          Arabya.ai
        </div>
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            lineHeight: 1.2,
            textAlign: "right",
            direction: "rtl",
          }}
        >
          {title}
        </div>
        <div
          style={{
            marginTop: 24,
            fontSize: 34,
            opacity: 0.9,
            direction: "rtl",
          }}
        >
          {subtitle}
        </div>
      </div>
    ),
    { ...size },
  );
}
