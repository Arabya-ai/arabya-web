import { sidecarTranscribe } from "@/lib/lughawi/sidecar-client";
import { enforceRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/**
 * Speech/video → text via Contabo sidecar → Hugging Face Whisper.
 * Body JSON: { audioBase64: string, filename?: string }
 */
export async function POST(req: Request) {
  const limited = enforceRateLimit(req, {
    prefix: "lughawi-transcribe",
    limit: 10,
  });
  if (limited) return limited;

  let body: { audioBase64?: string; filename?: string };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const audioBase64 =
    typeof body.audioBase64 === "string" ? body.audioBase64 : "";
  const filename =
    typeof body.filename === "string" && body.filename.trim()
      ? body.filename.trim().slice(0, 180)
      : "audio.webm";

  if (!audioBase64 || audioBase64.length < 32) {
    return NextResponse.json(
      { error: "أرفق ملف صوت أو فيديو" },
      { status: 400 },
    );
  }
  // ~25MB binary ≈ 34MB base64
  if (audioBase64.length > 34_000_000) {
    return NextResponse.json(
      { error: "الملف كبير جدًا (الحد ≈ 25 ميغابايت)" },
      { status: 400 },
    );
  }

  const result = await sidecarTranscribe(audioBase64, filename);
  if (!result) {
    return NextResponse.json(
      {
        error:
          "خدمة التحويل غير متاحة الآن. تأكد أن lughawi-sidecar يعمل وأن LUGHAWI_SIDECAR_URL مضبوط.",
      },
      { status: 503 },
    );
  }
  if (!result.ok) {
    return NextResponse.json(
      {
        error:
          result.error ||
          "فشل التحويل. ثبّت Whisper المحلي عبر contabo-lughawi-sidecar-deps.sh (أو أضف LUGHAWI_HF_TOKEN كتسريع).",
        engine: result.engine,
      },
      { status: 502 },
    );
  }

  return NextResponse.json({
    text: result.text,
    engine: result.engine,
  });
}
