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
  /** English word-by-word (Quran.com) */
  meaning: string;
  /** Morphology-based / Arabya lemma-sense Arabic study gloss */
  meaningAr?: string;
  /** Indonesian word-by-word */
  meaningId?: string;
  /** Urdu word-by-word */
  meaningUr?: string;
  transliteration: string;
  charType: string;
};

export type VerseTranslationEdition = {
  slug: string;
  resourceId: number;
  nameAr: string;
  nameEn: string;
  lang: string;
};

export type VerseTranslationSurah = {
  id: number;
  slug: string;
  nameAr: string;
  nameEn: string;
  lang: string;
  verses: { verseNumber: number; verseKey: string; text: string }[];
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
  /** Canonical ID e.g. W:001:001:001 */
  wordId?: string;
  segments: string;
  surface?: string;
  root?: string;
  lemma?: string;
  pos?: string[];
  features?: string[];
  /** Display iʿrāb text */
  irab: string;
  irabText?: string;
};

export type IrabSurah = {
  id: number;
  source: string;
  sourceUrl: string;
  license?: string;
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

export type RootOccurrence = {
  wordId: string;
  surahId: number;
  verse: number;
  position: number;
  surface: string;
  lemma?: string;
  page?: number;
};

export type RootEntry = {
  root: string;
  count: number;
  occurrences: RootOccurrence[];
};

export type RootsIndex = {
  source: string;
  sourceUrl: string;
  license: string;
  rootCount: number;
  occurrenceCap?: number | null;
  note?: string;
  roots: RootEntry[];
};
