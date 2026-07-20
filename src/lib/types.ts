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
  words: QuranWord[];
};

export type SurahContent = {
  id: number;
  nameArabic: string;
  versesCount: number;
  verses: Ayah[];
};
