/** SRT / WebVTT sidecar export from ayah segments + optional translation. */

export type CaptionCue = {
  index: number;
  startSec: number;
  endSec: number;
  text: string;
};

export type CaptionSegment = { start: number; end: number };

function pad2(n: number): string {
  return String(Math.floor(n)).padStart(2, "0");
}

function pad3(n: number): string {
  return String(Math.floor(n)).padStart(3, "0");
}

/** SRT timestamp: HH:MM:SS,mmm */
export function formatSrtTime(sec: number): string {
  const clamped = Math.max(0, sec);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = Math.floor(clamped % 60);
  const ms = Math.round((clamped % 1) * 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(ms)}`;
}

/** WebVTT timestamp: HH:MM:SS.mmm */
export function formatVttTime(sec: number): string {
  return formatSrtTime(sec).replace(",", ".");
}

export function buildCaptionCues(input: {
  ayahNumbers: number[];
  segments: CaptionSegment[];
  translationMap?: Record<number, string> | null;
  arabicTexts?: string[];
}): CaptionCue[] {
  const { ayahNumbers, segments, translationMap, arabicTexts } = input;
  const count = Math.min(
    ayahNumbers.length,
    segments.length,
    arabicTexts?.length ?? ayahNumbers.length,
  );
  const cues: CaptionCue[] = [];

  for (let i = 0; i < count; i += 1) {
    const seg = segments[i];
    if (!seg || seg.end <= seg.start) continue;
    const ayahNum = ayahNumbers[i]!;
    const ar = arabicTexts?.[i]?.trim();
    const tr = translationMap?.[ayahNum]?.trim();
    const lines = [ar, tr].filter(Boolean);
    if (lines.length === 0) continue;
    cues.push({
      index: cues.length + 1,
      startSec: seg.start,
      endSec: seg.end,
      text: lines.join("\n"),
    });
  }

  return cues;
}

export function cuesToSrt(cues: CaptionCue[]): string {
  return cues
    .map(
      (c) =>
        `${c.index}\n${formatSrtTime(c.startSec)} --> ${formatSrtTime(c.endSec)}\n${c.text}\n`,
    )
    .join("\n");
}

export function cuesToVtt(cues: CaptionCue[]): string {
  const body = cues
    .map(
      (c) =>
        `${formatVttTime(c.startSec)} --> ${formatVttTime(c.endSec)}\n${c.text}`,
    )
    .join("\n\n");
  return `WEBVTT\n\n${body}\n`;
}

export function downloadCaptionFile(
  content: string,
  filename: string,
  mime: string,
): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
