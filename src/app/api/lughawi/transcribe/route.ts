import { auth } from "@/auth";
import { sidecarTranscribe } from "@/lib/lughawi/sidecar-client";
import { enforceRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/**
 * Speech/video → text via Contabo sidecar (local Whisper / optional HF).
 * Requires a signed-in session — prevents anonymous CPU/RAM DoS on Contabo.
 * Body JSON: { audioBase64: string, filename?: string }
 */
export async function POST(req: Request) {
  const session = await auth();
  const email = session?.user?.email?.trim();
  if (!email || session?.error === "Banned") {
    return NextResponse.json(
      { error: "يلزم تسجيل الدخول لتحويل الصوت إلى نص" },
      { status: 401 },
    );
  }

  const limited = enforceRateLimit(req, {
    prefix: "lughawi-transcribe",
    limit: 6,
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
  // ~8MB binary ≈ 11MB base64 — keep Contabo Whisper load bounded
  if (audioBase64.length > 11_000_000) {
    return NextResponse.json(
      { error: "الملف كبير جدًا (الحد ≈ 8 ميغابايت)" },
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
