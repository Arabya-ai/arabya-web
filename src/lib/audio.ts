/** Audio helpers — multi-reciter EveryAyah + word-by-word Quran CDN + optional sync. */

export type Reciter = {
  id: string;
  nameAr: string;
  nameEn: string;
  /** EveryAyah folder name */
  folder: string;
  /** Quran.com chapter_recitations id when sync timings are available */
  quranComChapterReciterId?: number;
};

export const RECITERS: Reciter[] = [
  {
    id: "alafasy",
    nameAr: "مشاري العفاسي",
    nameEn: "Mishary Alafasy",
    folder: "Alafasy_128kbps",
    quranComChapterReciterId: 7,
  },
  {
    id: "husary",
    nameAr: "محمود خليل الحصري",
    nameEn: "Mahmoud Khalil Al-Husary",
    folder: "Husary_128kbps",
  },
  {
    id: "minshawi",
    nameAr: "محمد صديق المنشاوي",
    nameEn: "Muhammad Siddiq Al-Minshawi",
    folder: "Minshawy_Murattal_128kbps",
  },
  {
    id: "abdulbasit",
    nameAr: "عبد الباسط عبد الصمد",
    nameEn: "Abdul Basit Abdus Samad",
    folder: "Abdul_Basit_Murattal_192kbps",
  },
  {
    id: "sudais",
    nameAr: "عبد الرحمن السديس",
    nameEn: "Abdurrahman As-Sudais",
    folder: "Abdurrahmaan_As-Sudais_192kbps",
  },
  {
    id: "ghamdi",
    nameAr: "سعد الغامدي",
    nameEn: "Saad Al-Ghamdi",
    folder: "Ghamadi_40kbps",
  },
];

export const DEFAULT_RECITER_ID = "alafasy";

export function getReciter(id: string | null | undefined): Reciter {
  return RECITERS.find((r) => r.id === id) ?? RECITERS[0];
}

export function reciterDisplayName(
  reciter: Reciter,
  locale: string = "ar",
): string {
  return locale === "en" ? reciter.nameEn : reciter.nameAr;
}

/** True when Quran.com chapter timings exist for word-highlight sync. */
export function reciterHasWordSync(id: string | null | undefined): boolean {
  return Boolean(getReciter(id).quranComChapterReciterId);
}

export function ayahAudioUrl(
  surahId: number,
  verse: number,
  reciterId: string = DEFAULT_RECITER_ID,
): string {
  const reciter = getReciter(reciterId);
  const s = String(surahId).padStart(3, "0");
  const v = String(verse).padStart(3, "0");
  return `https://everyayah.com/data/${reciter.folder}/${s}${v}.mp3`;
}

/** Per-word clip from Quran.com CDN (path from API word.audio_url). */
export function wordAudioUrl(
  surahId: number,
  verse: number,
  position: number,
): string {
  const s = String(surahId).padStart(3, "0");
  const v = String(verse).padStart(3, "0");
  const w = String(position).padStart(3, "0");
  return `https://audio.qurancdn.com/wbw/${s}_${v}_${w}.mp3`;
}

export type WordTimingSegment = {
  position: number;
  startMs: number;
  endMs: number;
};

export type VerseTiming = {
  verseKey: string;
  timestampFrom: number;
  timestampTo: number;
  segments: WordTimingSegment[];
};
