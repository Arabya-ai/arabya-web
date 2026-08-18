/** Validate MoneyPrinterTurbo video/script payloads before proxying. */

export const MPT_ASPECTS = ["9:16", "16:9", "1:1"] as const;
export type MptAspect = (typeof MPT_ASPECTS)[number];

export const MPT_SOURCES = ["pexels", "pixabay", "coverr", "local"] as const;
export type MptSource = (typeof MPT_SOURCES)[number];

export const MPT_CONCAT_MODES = ["random", "sequential"] as const;
export type MptConcatMode = (typeof MPT_CONCAT_MODES)[number];

export const MPT_SUBTITLE_POSITIONS = ["top", "center", "bottom", "custom"] as const;
export type MptSubtitlePosition = (typeof MPT_SUBTITLE_POSITIONS)[number];

export const MPT_BGM_TYPES = ["random", "custom"] as const;

const HEX = /^#([0-9A-Fa-f]{6})$/;

function asRecord(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as Record<string, unknown>;
}

function clipString(value: unknown, max: number, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, max);
}

function clipNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export type ParseResult<T> =
  | { ok: true; body: T }
  | { ok: false; error: string };

export type MptVideoBody = {
  video_subject: string;
  video_script: string;
  video_terms: string;
  video_language: string;
  video_aspect: MptAspect;
  video_concat_mode: MptConcatMode;
  video_clip_duration: number;
  video_count: number;
  video_source: MptSource;
  voice_name: string;
  voice_volume: number;
  voice_rate: number;
  bgm_type: string;
  bgm_volume: number;
  subtitle_enabled: boolean;
  subtitle_position: MptSubtitlePosition;
  font_name: string;
  font_size: number;
  text_fore_color: string;
  stroke_color: string;
  stroke_width: number;
  paragraph_number: number;
};

export function parseMptVideoBody(raw: unknown): ParseResult<MptVideoBody> {
  const input = asRecord(raw);
  const video_subject = clipString(input.video_subject, 500);
  if (video_subject.length < 2) {
    return { ok: false, error: "missing_subject" };
  }

  const text_fore_color = clipString(input.text_fore_color, 7, "#FFFFFF");
  const stroke_color = clipString(input.stroke_color, 7, "#000000");
  if (!HEX.test(text_fore_color) || !HEX.test(stroke_color)) {
    return { ok: false, error: "invalid_color" };
  }

  return {
    ok: true,
    body: {
      video_subject,
      video_script: clipString(input.video_script, 8000),
      video_terms: clipString(input.video_terms, 2000),
      video_language: clipString(input.video_language, 64, "Arabic") || "Arabic",
      video_aspect: oneOf(input.video_aspect, MPT_ASPECTS, "9:16"),
      video_concat_mode: oneOf(input.video_concat_mode, MPT_CONCAT_MODES, "random"),
      video_clip_duration: clipNumber(input.video_clip_duration, 2, 20, 5),
      video_count: clipNumber(input.video_count, 1, 3, 1),
      video_source: oneOf(input.video_source, MPT_SOURCES, "pexels"),
      voice_name: clipString(
        input.voice_name,
        80,
        "ar-SA-ZariyahNeural-Female",
      ),
      voice_volume: clipNumber(input.voice_volume, 0.1, 2, 1),
      voice_rate: clipNumber(input.voice_rate, 0.5, 2, 1),
      bgm_type: oneOf(input.bgm_type, MPT_BGM_TYPES, "random"),
      bgm_volume: clipNumber(input.bgm_volume, 0, 1, 0.2),
      subtitle_enabled: input.subtitle_enabled !== false,
      subtitle_position: oneOf(
        input.subtitle_position,
        MPT_SUBTITLE_POSITIONS,
        "bottom",
      ),
      font_name: clipString(input.font_name, 80, "BeVietnamPro-Bold.ttf"),
      font_size: clipNumber(input.font_size, 24, 120, 60),
      text_fore_color,
      stroke_color,
      stroke_width: clipNumber(input.stroke_width, 0, 4, 1.5),
      paragraph_number: clipNumber(input.paragraph_number, 1, 5, 1),
    },
  };
}

export type MptScriptBody = {
  video_subject: string;
  video_language: string;
  paragraph_number: number;
};

export function parseMptScriptBody(raw: unknown): ParseResult<MptScriptBody> {
  const input = asRecord(raw);
  const video_subject = clipString(input.video_subject, 500);
  if (video_subject.length < 2) {
    return { ok: false, error: "missing_subject" };
  }
  return {
    ok: true,
    body: {
      video_subject,
      video_language: clipString(input.video_language, 64, "Arabic") || "Arabic",
      paragraph_number: clipNumber(input.paragraph_number, 1, 5, 1),
    },
  };
}

export type MptTermsBody = {
  video_subject: string;
  video_script: string;
  amount: number;
};

export function parseMptTermsBody(raw: unknown): ParseResult<MptTermsBody> {
  const input = asRecord(raw);
  const video_subject = clipString(input.video_subject, 500);
  const video_script = clipString(input.video_script, 8000);
  if (video_subject.length < 2 || video_script.length < 8) {
    return { ok: false, error: "missing_script" };
  }
  return {
    ok: true,
    body: {
      video_subject,
      video_script,
      amount: clipNumber(input.amount, 3, 12, 5),
    },
  };
}

export function isSafeTaskId(taskId: string): boolean {
  return /^[A-Za-z0-9_-]{8,80}$/.test(taskId);
}
