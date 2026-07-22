import { ImageResponse } from "next/og";
import { OG_IMAGE_SIZE } from "@/lib/og-meta";

export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";
export const alt = "Arabya — عربية بذكاء";

export default function OgImage() {
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
              fontSize: 68,
              fontWeight: 700,
              direction: "rtl",
              textAlign: "right",
            }}
          >
            عربية
          </div>
          <div style={{ fontSize: 32, opacity: 0.9, direction: "rtl" }}>
            تفسير كلمات القرآن · إعراب · دراسة
          </div>
        </div>
        <div style={{ fontSize: 24, opacity: 0.75, direction: "rtl" }}>
          عربية بذكاء
        </div>
      </div>
    ),
    { ...size },
  );
}
