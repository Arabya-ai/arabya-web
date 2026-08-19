"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Film,
  Mic,
  Subtitles,
  Music,
  Type,
  MonitorPlay,
} from "lucide-react";
import type { MptVideoBody } from "@/lib/mpt-payload";

const ASPECT_DIMENSIONS: Record<string, { w: number; h: number }> = {
  "9:16": { w: 9, h: 16 },
  "16:9": { w: 16, h: 9 },
  "1:1": { w: 1, h: 1 },
};

interface CreatePreviewProps {
  form: MptVideoBody;
}

export function CreatePreview({ form }: CreatePreviewProps) {
  const t = useTranslations("StudioAi");

  const dims = ASPECT_DIMENSIONS[form.video_aspect] ?? { w: 9, h: 16 };
  const isPortrait = dims.h > dims.w;

  const previewSubject = form.video_subject.trim() || t("previewPlaceholderSubject");
  const previewScript = form.video_script.trim();

  const scriptPreview = useMemo(() => {
    if (!previewScript) return null;
    const lines = previewScript.split(/\n/).filter((l) => l.trim());
    const first = lines[0] ?? "";
    return first.length > 80 ? first.slice(0, 77) + "…" : first;
  }, [previewScript]);

  const badges = useMemo(() => {
    const items: { icon: typeof Film; label: string; active: boolean }[] = [
      {
        icon: Subtitles,
        label: t("previewBadgeSubs"),
        active: form.subtitle_enabled,
      },
      {
        icon: Music,
        label: t("previewBadgeBgm"),
        active: form.bgm_volume > 0,
      },
    ];
    return items;
  }, [form.subtitle_enabled, form.bgm_volume, t]);

  return (
    <div className="mpt-create-preview flex flex-col items-center gap-4">
      <p className="text-center text-[11px] tracking-widest uppercase text-accent/80 sm:text-xs">
        {t("previewLabel")}
      </p>

      {/* Aspect-ratio frame */}
      <div
        className="relative mx-auto w-full overflow-hidden rounded-2xl border border-primary/25 shadow-deep"
        style={{
          maxWidth: isPortrait ? "220px" : "100%",
          aspectRatio: `${dims.w} / ${dims.h}`,
          background:
            "linear-gradient(160deg, hsl(var(--primary)/0.12) 0%, hsl(var(--card)) 40%, hsl(var(--primary)/0.06) 100%)",
        }}
      >
        {/* Subtle grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 23px, hsl(var(--primary)) 23px, hsl(var(--primary)) 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, hsl(var(--primary)) 23px, hsl(var(--primary)) 24px)",
          }}
        />

        {/* Content mock */}
        <div className="relative z-[1] flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
          {/* Film icon */}
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/30 bg-accent/10">
            <MonitorPlay className="h-5 w-5 text-accent" />
          </div>

          {/* Subject title */}
          <p
            className="font-display text-sm font-bold leading-snug text-foreground sm:text-base"
            style={{ maxWidth: "90%" }}
          >
            {previewSubject}
          </p>

          {/* Script preview line */}
          {scriptPreview && (
            <p className="mx-auto max-w-[85%] text-[11px] leading-relaxed text-muted-foreground line-clamp-2">
              {scriptPreview}
            </p>
          )}

          {/* Subtitle mock line */}
          {form.subtitle_enabled && (
            <div
              className="mt-auto w-[80%] rounded-md px-2 py-1"
              style={{
                backgroundColor: "rgba(0,0,0,0.55)",
              }}
            >
              <p
                className="text-center text-[10px] font-semibold leading-tight sm:text-xs"
                style={{
                  color: form.text_fore_color || "#FFFFFF",
                  WebkitTextStroke: form.stroke_width
                    ? `${Math.min(form.stroke_width, 1)}px ${form.stroke_color || "#000"}`
                    : undefined,
                }}
              >
                {scriptPreview || t("previewSubtitleSample")}
              </p>
            </div>
          )}
        </div>

        {/* Aspect label */}
        <div className="absolute start-2 top-2 z-[2] rounded-md bg-black/50 px-1.5 py-0.5 text-[9px] font-medium text-white/80 backdrop-blur-sm">
          {form.video_aspect}
        </div>
      </div>

      {/* Settings summary badges */}
      <div className="flex flex-wrap justify-center gap-2">
        {/* Source */}
        <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-[10px] font-medium text-accent sm:text-[11px]">
          <Film className="h-3 w-3" />
          {form.video_source}
        </span>

        {/* Voice */}
        <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-[10px] font-medium text-accent sm:text-[11px]">
          <Mic className="h-3 w-3" />
          {form.voice_name.split("-").slice(0, 3).join("-")}
        </span>

        {/* Text color */}
        <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent/5 px-2.5 py-1 text-[10px] font-medium text-accent sm:text-[11px]">
          <Type className="h-3 w-3" />
          <span
            className="inline-block h-3 w-3 rounded-full border border-white/30"
            style={{ backgroundColor: form.text_fore_color || "#FFF" }}
          />
        </span>

        {badges.map((b) => (
          <span
            key={b.label}
            className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium sm:text-[11px] ${
              b.active
                ? "border-accent/20 bg-accent/5 text-accent"
                : "border-border bg-muted/30 text-muted-foreground line-through"
            }`}
          >
            <b.icon className="h-3 w-3" />
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
