/** Audio helpers — multi-reciter EveryAyah + word-by-word Quran CDN + optional sync.
 *
 * Recitation files are served from everyayah.com (public educational hosting).
 * Performances may still be claimed on social platforms (Content ID); Arabya does
 * not assert commercial rights over reciters' voices. Prefer attribution on publish.
 */

export type Reciter = {
  id: string;
  nameAr: string;
  nameEn: string;
  /** EveryAyah folder name */
  folder: string;
  /** Style note shown in picker (optional) */
  style?: string;
  /** Quran.com chapter_recitations id when sync timings are available */
  quranComChapterReciterId?: number;
};

function R(
  id: string,
  nameAr: string,
  nameEn: string,
  folder: string,
  style?: string,
  quranComChapterReciterId?: number,
): Reciter {
  return { id, nameAr, nameEn, folder, style, quranComChapterReciterId };
}

/**
 * Listening reciters for Mushaf / portal — includes all Studio EveryAyah folders.
 * Legacy short ids (alafasy, husary, …) are kept first for saved preferences.
 */
export const RECITERS: Reciter[] = [
  R("alafasy", "مشاري العفاسي", "Mishary Alafasy", "Alafasy_128kbps", "مرتل", 7),
  R("husary", "محمود خليل الحصري", "Mahmoud Khalil Al-Husary", "Husary_128kbps", "مرتل"),
  R("minshawi", "محمد صديق المنشاوي", "Muhammad Siddiq Al-Minshawi", "Minshawy_Murattal_128kbps", "مرتل"),
  R("abdulbasit", "عبد الباسط عبد الصمد", "Abdul Basit Abdus Samad", "Abdul_Basit_Murattal_192kbps", "مرتل"),
  R("sudais", "عبد الرحمن السديس", "Abdurrahman As-Sudais", "Abdurrahmaan_As-Sudais_192kbps", "مرتل"),
  R("ghamdi", "سعد الغامدي", "Saad Al-Ghamdi", "Ghamadi_40kbps", "مرتل"),

  R("abdulbasit-mujawwad", "عبد الباسط (مجود)", "Abdul Basit Mujawwad", "Abdul_Basit_Mujawwad_128kbps", "مجود"),
  R("maher", "ماهر المعيقلي", "Maher Al-Muaiqly", "MaherAlMuaiqly128kbps", "مرتل"),
  R("maher-64", "ماهر المعيقلي (64k)", "Maher Al-Muaiqly 64k", "Maher_AlMuaiqly_64kbps", "مرتل"),
  R("shuraym", "سعود الشريم", "Saud Ash-Shuraym", "Saood_ash-Shuraym_128kbps", "مرتل"),
  R("ajamy", "أحمد بن علي العجمي", "Ahmed Al-Ajamy", "ahmed_ibn_ali_al_ajamy_128kbps", "مرتل"),
  R("hani-rifai", "هاني الرفاعي", "Hani Rifai", "Hani_Rifai_192kbps", "مرتل"),
  R("husary-mujawwad", "الحصري (مجود)", "Al-Husary Mujawwad", "Husary_128kbps_Mujawwad", "مجود"),
  R("husary-muallim", "الحصري (معلم)", "Al-Husary Muallim", "Husary_Muallim_128kbps", "معلم"),
  R("minshawi-mujawwad", "المنشاوي (مجود)", "Minshawi Mujawwad", "Minshawy_Mujawwad_192kbps", "مجود"),
  R("basfar", "عبد الله بصفر", "Abdullah Basfar", "Abdullah_Basfar_192kbps", "مرتل"),
  R("matroud", "عبد الله مطرود", "Abdullah Matroud", "Abdullah_Matroud_128kbps", "مرتل"),
  R("juhaynee", "عبد الله عواد الجهني", "Abdullah Al-Juhaynee", "Abdullaah_3awwaad_Al-Juhaynee_128kbps", "مرتل"),
  R("shaatree", "أبو بكر الشاطري", "Abu Bakr Ash-Shaatree", "Abu_Bakr_Ash-Shaatree_128kbps", "مرتل"),
  R("neana", "أحمد نعينع", "Ahmed Neana", "Ahmed_Neana_128kbps", "مرتل"),
  R("alaqimy", "أكرم العلاقمي", "Akram Al-Alaqimy", "Akram_AlAlaqimy_128kbps", "مرتل"),
  R("ali-jaber", "علي جابر", "Ali Jaber", "Ali_Jaber_64kbps", "مرتل"),
  R("ali-hajjaj", "علي حجاج السويسي", "Ali Hajjaj Al-Suesy", "Ali_Hajjaj_AlSuesy_128kbps", "مرتل"),
  R("ayman-sowaid", "أيمن سويد", "Ayman Sowaid", "Ayman_Sowaid_64kbps", "مرتل"),
  R("aziz-alili", "عزيز عليلي", "Aziz Alili", "aziz_alili_128kbps", "مرتل"),
  R("fares-abbad", "فارس عباد", "Fares Abbad", "Fares_Abbad_64kbps", "مرتل"),
  R("hudhaify", "علي الحذيفي", "Ali Al-Hudhaify", "Hudhaify_128kbps", "مرتل"),
  R("ibrahim-akhdar", "إبراهيم الأخضر", "Ibrahim Al-Akhdar", "Ibrahim_Akhdar_32kbps", "مرتل"),
  R("karim-mansoori", "كريم منصوري", "Karim Mansoori", "Karim_Mansoori_40kbps", "مرتل"),
  R("tunaiji", "خليفة الطنيجي", "Khalefa Al-Tunaiji", "khalefa_al_tunaiji_64kbps", "مرتل"),
  R("qahtaanee", "خالد القحطاني", "Khaalid Al-Qahtaanee", "Khaalid_Abdullaah_al-Qahtaanee_192kbps", "مرتل"),
  R("banna", "محمود علي البنا", "Mahmoud Ali Al-Banna", "mahmoud_ali_al_banna_32kbps", "مرتل"),
  R("menshawi-16", "المنشاوي (16k)", "Menshawi 16k", "Menshawi_16kbps", "مرتل"),
  R("tablaway", "محمد الطبلاوي", "Mohammad Al-Tablaway", "Mohammad_al_Tablaway_128kbps", "مرتل"),
  R("abdul-kareem", "محمد عبد الكريم", "Muhammad AbdulKareem", "Muhammad_AbdulKareem_128kbps", "مرتل"),
  R("ayyoub", "محمد أيوب", "Muhammad Ayyoub", "Muhammad_Ayyoub_128kbps", "مرتل"),
  R("jibreel", "محمد جبريل", "Muhammad Jibreel", "Muhammad_Jibreel_128kbps", "مرتل"),
  R("muhsin-qasim", "محسن القاسم", "Muhsin Al-Qasim", "Muhsin_Al_Qasim_192kbps", "مرتل"),
  R("nabil-rifai", "نبيل الرفاعي", "Nabil Rifai", "Nabil_Rifa3i_48kbps", "مرتل"),
  R("qatami", "ناصر القطامي", "Nasser Al-Qatami", "Nasser_Alqatami_128kbps", "مرتل"),
  R("sahl-yassin", "سهل ياسين", "Sahl Yassin", "Sahl_Yassin_128kbps", "مرتل"),
  R("bukhatir", "صلاح بوخاطر", "Salah Bukhatir", "Salaah_AbdulRahman_Bukhatir_128kbps", "مرتل"),
  R("budair", "صلاح البدير", "Salah Al-Budair", "Salah_Al_Budair_128kbps", "مرتل"),
  R("yaser-salamah", "ياسر سلامة", "Yaser Salamah", "Yaser_Salamah_128kbps", "مرتل"),
  R("dussary", "ياسر الدوسري", "Yasser Ad-Dussary", "Yasser_Ad-Dussary_128kbps", "مرتل"),
  R("abdulsamad-qe", "عبد الباسط (QE)", "AbdulSamad QuranExplorer", "AbdulSamad_64kbps_QuranExplorer.Com", "مرتل"),
  R("warsh-aldosary", "إبراهيم الدوسري (ورش)", "Ibrahim Al-Dosary (Warsh)", "warsh/warsh_ibrahim_aldosary_128kbps", "ورش"),
  R("warsh-jazaery", "ياسين الجزائري (ورش)", "Yassin Al-Jazaery (Warsh)", "warsh/warsh_yassin_al_jazaery_64kbps", "ورش"),
];

export const DEFAULT_RECITER_ID = "alafasy";

export function getReciter(id: string | null | undefined): Reciter {
  if (!id) return RECITERS[0];
  return (
    RECITERS.find((r) => r.id === id) ||
    RECITERS.find((r) => r.folder === id) ||
    RECITERS[0]
  );
}

export function reciterDisplayName(
  reciter: Reciter,
  locale: string = "ar",
): string {
  const base = locale === "en" ? reciter.nameEn : reciter.nameAr;
  return reciter.style ? `${base} · ${reciter.style}` : base;
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

/** Same-origin EveryAyah proxy — preferred for mushaf HTMLAudioElement playback. */
export function mushafAyahAudioUrl(
  surahId: number,
  verse: number,
  reciterId: string = DEFAULT_RECITER_ID,
): string {
  const reciter = getReciter(reciterId);
  const q = new URLSearchParams({
    folder: reciter.folder,
    s: String(surahId),
    v: String(verse),
  });
  return `/api/mushaf/audio?${q.toString()}`;
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
