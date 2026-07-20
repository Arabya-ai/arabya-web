import { ImageResponse } from "next/og";
import { getMushafPage } from "@/lib/mushaf";
import { getSurahUthmaniTitle } from "@/lib/surah-names";
import { toArabicNumerals } from "@/lib/format";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Arabya — مصحف ودراسة الكلمات";

type Props = {
  params: Promise<{ page: string }>;
};

export default async function OgImage({ params }: Props) {
  const { page } = await params;
  const pageNum = Number(page);
  let title = `صفحة ${page}`;
  let subtitle = "Arabya — دراسة كلمات القرآن";
  let ayahSnippet = "";

  if (Number.isInteger(pageNum) && pageNum >= 1 && pageNum <= 604) {
    try {
      const content = await getMushafPage(pageNum);
      if (content) {
        const first = content.blocks[0];
        title =
          content.blocks.length === 1
            ? getSurahUthmaniTitle(first.surahId)
            : "مصحف المدينة";
        subtitle = `صفحة ${toArabicNumerals(pageNum)} · Arabya`;
        const verse = first?.verses?.[0];
        if (verse) {
          ayahSnippet = verse.words
            .slice(0, 12)
            .map((w) => w.text)
            .join(" ");
          if (verse.words.length > 12) ayahSnippet += " …";
        }
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
            width: "100%",
            gap: 16,
          }}
        >
          <div
            style={{
              fontSize: 64,
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
              fontSize: 30,
              opacity: 0.9,
              direction: "rtl",
            }}
          >
            {subtitle}
          </div>
          {ayahSnippet ? (
            <div
              style={{
                marginTop: 12,
                padding: "18px 22px",
                borderRadius: 18,
                background: "rgba(15, 23, 42, 0.28)",
                border: "1px solid rgba(153, 246, 228, 0.35)",
                fontSize: 36,
                lineHeight: 1.7,
                textAlign: "right",
                direction: "rtl",
                maxWidth: "100%",
              }}
            >
              {ayahSnippet}
            </div>
          ) : null}
        </div>

        <div style={{ fontSize: 24, opacity: 0.75, direction: "rtl" }}>
          عربية بذكاء · تفسير كلمات القرآن
        </div>
      </div>
    ),
    { ...size },
  );
}
