/** Client helpers to load translation / tafsir text for studio preview + export. */

export type StudioEdition = {
  slug: string;
  nameAr: string;
  nameEn?: string;
  lang?: string;
};

export async function fetchStudioEditions(): Promise<{
  translations: StudioEdition[];
  tafsirs: StudioEdition[];
}> {
  const res = await fetch("/api/studio/editions", { credentials: "same-origin" });
  if (!res.ok) throw new Error("فشل جلب قائمة الترجمات والتفاسير");
  return res.json();
}

export async function fetchTranslationMap(
  slug: string,
  surahId: number,
): Promise<Record<number, string>> {
  const res = await fetch(`/api/translation/${encodeURIComponent(slug)}/${surahId}`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error("فشل جلب الترجمة");
  const json = await res.json();
  const map: Record<number, string> = {};
  for (const v of json.verses || []) {
    map[v.verseNumber] = String(v.text || "").trim();
  }
  return map;
}

export async function fetchTafsirMap(
  slug: string,
  surahId: number,
): Promise<Record<number, string>> {
  const res = await fetch(`/api/tafsir/${encodeURIComponent(slug)}/${surahId}`, {
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error("فشل جلب التفسير");
  const json = await res.json();
  const map: Record<number, string> = {};
  for (const v of json.verses || []) {
    map[v.verseNumber] = String(v.text || "").trim();
  }
  return map;
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
