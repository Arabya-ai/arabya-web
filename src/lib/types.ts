export type SurahMeta = {
  id: number;
  nameArabic: string;
  nameSimple: string;
  versesCount: number;
  revelationPlace: "makkah" | "madinah";
  revelationLabel: string;
  juz: number;
  juzLabel: string;
};

export type QuranWord = {
  position: number;
  text: string;
  meaning: string;
  transliteration: string;
  charType: string;
};

export type Ayah = {
  verseNumber: number;
  verseKey: string;
  juz: number;
  page: number;
  words: QuranWord[];
};

export type SurahContent = {
  id: number;
  nameArabic: string;
  versesCount: number;
  verses: Ayah[];
};

export type IrabWord = {
  position: number;
  segments: string;
  irab: string;
};

export type IrabSurah = {
  id: number;
  source: string;
  sourceUrl: string;
  verses: { verseNumber: number; words: IrabWord[] }[];
};

export type TafsirVerse = {
  verseKey: string;
  verseNumber: number;
  text: string;
};

export type TafsirSurah = {
  id: number;
  slug: string;
  nameAr: string;
  verses: TafsirVerse[];
};

export type TafsirSource = {
  slug: string;
  nameAr: string;
  resourceId: number;
};

export type StudyMode = "words" | "irab" | string;

export type MushafPageVerse = {
  surahId: number;
  verseNumber: number;
  verseKey: string;
  juz: number;
};

export type MushafIndex = {
  totalPages: number;
  surahFirstPage: Record<string, number>;
  surahPages: Record<string, number[]>;
  pages: Record<string, MushafPageVerse[]>;
};
