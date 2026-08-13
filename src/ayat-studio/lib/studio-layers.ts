/** Client helpers to load translation / tafsir text for studio preview + export. */

export type StudioEdition = {
  slug: string;
  nameAr: string;
  nameEn?: string;
  lang?: string;
};

/** Cap tafsir body kept in memory / textarea — preview already clips shorter. */
export const STUDIO_LAYER_TEXT_MAX_CHARS = 2_000;

export async function fetchStudioEditions(): Promise<{
  translations: StudioEdition[];
  tafsirs: StudioEdition[];
}> {
  const res = await fetch("/api/studio/editions", { credentials: "same-origin" });
  if (!res.ok) throw new Error("فشل جلب قائمة الترجمات والتفاسير");
  return res.json();
}

function buildVerseMap(
  verses: Array<{ verseNumber?: number; text?: string }> | undefined,
  opts?: { from?: number; to?: number; maxChars?: number },
): Record<number, string> {
  const map: Record<number, string> = {};
  const from = opts?.from;
  const to = opts?.to;
  const maxChars = opts?.maxChars;
  for (const v of verses || []) {
    const n = Number(v.verseNumber);
    if (!Number.isInteger(n) || n < 1) continue;
    if (from != null && n < from) continue;
    if (to != null && n > to) continue;
    let text = String(v.text || "").trim();
    if (maxChars != null && text.length > maxChars) {
      text = `${text.slice(0, maxChars)}…`;
    }
    map[n] = text;
  }
  return map;
}

export async function fetchTranslationMap(
  slug: string,
  surahId: number,
  range?: { from: number; to: number },
): Promise<Record<number, string>> {
  const q = new URLSearchParams();
  if (range) {
    q.set("from", String(range.from));
    q.set("to", String(range.to));
  }
  const qs = q.toString();
  const res = await fetch(
    `/api/translation/${encodeURIComponent(slug)}/${surahId}${qs ? `?${qs}` : ""}`,
    { credentials: "same-origin" },
  );
  if (!res.ok) throw new Error("فشل جلب الترجمة");
  const json = await res.json();
  return buildVerseMap(json.verses, {
    from: range?.from,
    to: range?.to,
    maxChars: STUDIO_LAYER_TEXT_MAX_CHARS,
  });
}

export async function fetchTafsirMap(
  slug: string,
  surahId: number,
  range?: { from: number; to: number },
): Promise<Record<number, string>> {
  const q = new URLSearchParams();
  if (range) {
    q.set("from", String(range.from));
    q.set("to", String(range.to));
  }
  const qs = q.toString();
  const res = await fetch(
    `/api/tafsir/${encodeURIComponent(slug)}/${surahId}${qs ? `?${qs}` : ""}`,
    { credentials: "same-origin" },
  );
  if (!res.ok) throw new Error("فشل جلب التفسير");
  const json = await res.json();
  return buildVerseMap(json.verses, {
    from: range?.from,
    to: range?.to,
    maxChars: STUDIO_LAYER_TEXT_MAX_CHARS,
  });
}

export function layerKey(surahId: number, ayah: number): string {
  return `${surahId}:${ayah}`;
}

export function resolveLayerText(
  map: Record<number, string> | null,
  overrides: Record<string, string> | undefined,
  surahId: number,
  ayah: number,
): string {
  const o = overrides?.[layerKey(surahId, ayah)];
  if (o != null && o.length > 0) return o;
  return map?.[ayah] || "";
}
