import { ImageResponse } from "next/og";
import { getSurah, getSurahMeta } from "@/lib/quran";
import { getSurahUthmaniTitle } from "@/lib/surah-names";
import { toArabicNumerals } from "@/lib/format";
import { OG_IMAGE_SIZE } from "@/lib/og-meta";

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "Arabya — إعراب آية";

type Props = { params: Promise<{ surah: string; verse: string }> };

export default async function AyahOgImage({ params }: Props) {
  const { surah, verse } = await params;
  const surahId = Number(surah);
  const verseNumber = Number(verse);
  let title = "إعراب آية";
  let snippet = "";

  if (
    Number.isInteger(surahId) &&
    Number.isInteger(verseNumber) &&
    surahId >= 1 &&
    surahId <= 114
  ) {
    title = `إعراب ${getSurahUthmaniTitle(surahId)} ${toArabicNumerals(verseNumber)}`;
    try {
      const [content, meta] = await Promise.all([
        getSurah(surahId),
        getSurahMeta(surahId),
      ]);
      const ayah = content?.verses.find((v) => v.verseNumber === verseNumber);
      if (ayah && meta) {
        snippet = ayah.words
          .filter((w) => !w.charType || w.charType === "word")
          .slice(0, 12)
          .map((w) => w.text)
          .join(" ");
        if (ayah.words.length > 12) snippet += " …";
      }
    } catch {
      /* defaults */
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
            gap: 16,
            width: "100%",
          }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              direction: "rtl",
              textAlign: "right",
            }}
          >
            {title}
          </div>
          {snippet ? (
            <div
              style={{
                padding: "18px 22px",
                borderRadius: 18,
                background: "rgba(15, 23, 42, 0.28)",
                border: "1px solid rgba(153, 246, 228, 0.35)",
                fontSize: 34,
                lineHeight: 1.7,
                direction: "rtl",
                textAlign: "right",
              }}
            >
              {snippet}
            </div>
          ) : null}
        </div>
        <div style={{ fontSize: 24, opacity: 0.75, direction: "rtl" }}>
          إعراب كلمة بكلمة
        </div>
      </div>
    ),
    { ...size },
  );
}
