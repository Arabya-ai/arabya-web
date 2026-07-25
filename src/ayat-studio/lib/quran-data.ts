// Reciters from everyayah.com — id is the everyayah folder name
export interface Reciter {
  id: string; // everyayah folder
  name: string; // Arabic display name
  style: string; // مرتل / مجود / معلم / ورش
  bitrate: string;
}

export const reciters: Reciter[] = [
  { id: "Alafasy_128kbps", name: "مشاري راشد العفاسي", style: "مرتل", bitrate: "128k" },
  { id: "Abdul_Basit_Murattal_192kbps", name: "عبد الباسط عبد الصمد", style: "مرتل", bitrate: "192k" },
  { id: "Abdul_Basit_Mujawwad_128kbps", name: "عبد الباسط عبد الصمد", style: "مجود", bitrate: "128k" },
  { id: "MaherAlMuaiqly128kbps", name: "ماهر المعيقلي", style: "مرتل", bitrate: "128k" },
  { id: "Maher_AlMuaiqly_64kbps", name: "ماهر المعيقلي", style: "مرتل", bitrate: "64k" },
  { id: "Saood_ash-Shuraym_128kbps", name: "سعود الشريم", style: "مرتل", bitrate: "128k" },
  { id: "Abdurrahmaan_As-Sudais_192kbps", name: "عبد الرحمن السديس", style: "مرتل", bitrate: "192k" },
  { id: "ahmed_ibn_ali_al_ajamy_128kbps", name: "أحمد بن علي العجمي", style: "مرتل", bitrate: "128k" },
  { id: "Hani_Rifai_192kbps", name: "هاني الرفاعي", style: "مرتل", bitrate: "192k" },
  { id: "Husary_128kbps", name: "محمود خليل الحصري", style: "مرتل", bitrate: "128k" },
  { id: "Husary_128kbps_Mujawwad", name: "محمود خليل الحصري", style: "مجود", bitrate: "128k" },
  { id: "Husary_Muallim_128kbps", name: "محمود خليل الحصري", style: "معلم", bitrate: "128k" },
  { id: "Minshawy_Murattal_128kbps", name: "محمد صديق المنشاوي", style: "مرتل", bitrate: "128k" },
  { id: "Minshawy_Mujawwad_192kbps", name: "محمد صديق المنشاوي", style: "مجود", bitrate: "192k" },
  { id: "Abdullah_Basfar_192kbps", name: "عبد الله بصفر", style: "مرتل", bitrate: "192k" },
  { id: "Abdullah_Matroud_128kbps", name: "عبد الله مطرود", style: "مرتل", bitrate: "128k" },
  { id: "Abdullaah_3awwaad_Al-Juhaynee_128kbps", name: "عبد الله عواد الجهني", style: "مرتل", bitrate: "128k" },
  { id: "Abu_Bakr_Ash-Shaatree_128kbps", name: "أبو بكر الشاطري", style: "مرتل", bitrate: "128k" },
  { id: "Ahmed_Neana_128kbps", name: "أحمد نعينع", style: "مرتل", bitrate: "128k" },
  { id: "Akram_AlAlaqimy_128kbps", name: "أكرم العلاقمي", style: "مرتل", bitrate: "128k" },
  { id: "Ali_Jaber_64kbps", name: "علي جابر", style: "مرتل", bitrate: "64k" },
  { id: "Ali_Hajjaj_AlSuesy_128kbps", name: "علي حجاج السويسي", style: "مرتل", bitrate: "128k" },
  { id: "Ayman_Sowaid_64kbps", name: "أيمن سويد", style: "مرتل", bitrate: "64k" },
  { id: "aziz_alili_128kbps", name: "عزيز عليلي", style: "مرتل", bitrate: "128k" },
  { id: "Fares_Abbad_64kbps", name: "فارس عباد", style: "مرتل", bitrate: "64k" },
  { id: "Ghamadi_40kbps", name: "سعد الغامدي", style: "مرتل", bitrate: "40k" },
  { id: "Hudhaify_128kbps", name: "علي الحذيفي", style: "مرتل", bitrate: "128k" },
  { id: "Ibrahim_Akhdar_32kbps", name: "إبراهيم الأخضر", style: "مرتل", bitrate: "32k" },
  { id: "Karim_Mansoori_40kbps", name: "كريم منصوري", style: "مرتل", bitrate: "40k" },
  { id: "khalefa_al_tunaiji_64kbps", name: "خليفة الطنيجي", style: "مرتل", bitrate: "64k" },
  { id: "Khaalid_Abdullaah_al-Qahtaanee_192kbps", name: "خالد عبد الله القحطاني", style: "مرتل", bitrate: "192k" },
  { id: "mahmoud_ali_al_banna_32kbps", name: "محمود علي البنا", style: "مرتل", bitrate: "32k" },
  { id: "Menshawi_16kbps", name: "محمد صديق المنشاوي", style: "مرتل", bitrate: "16k" },
  { id: "Mohammad_al_Tablaway_128kbps", name: "محمد الطبلاوي", style: "مرتل", bitrate: "128k" },
  { id: "Muhammad_AbdulKareem_128kbps", name: "محمد عبد الكريم", style: "مرتل", bitrate: "128k" },
  { id: "Muhammad_Ayyoub_128kbps", name: "محمد أيوب", style: "مرتل", bitrate: "128k" },
  { id: "Muhammad_Jibreel_128kbps", name: "محمد جبريل", style: "مرتل", bitrate: "128k" },
  { id: "Muhsin_Al_Qasim_192kbps", name: "محسن القاسم", style: "مرتل", bitrate: "192k" },
  { id: "Nabil_Rifa3i_48kbps", name: "نبيل الرفاعي", style: "مرتل", bitrate: "48k" },
  { id: "Nasser_Alqatami_128kbps", name: "ناصر القطامي", style: "مرتل", bitrate: "128k" },
  { id: "Sahl_Yassin_128kbps", name: "سهل ياسين", style: "مرتل", bitrate: "128k" },
  { id: "Salaah_AbdulRahman_Bukhatir_128kbps", name: "صلاح بوخاطر", style: "مرتل", bitrate: "128k" },
  { id: "Salah_Al_Budair_128kbps", name: "صلاح البدير", style: "مرتل", bitrate: "128k" },
  { id: "Yaser_Salamah_128kbps", name: "ياسر سلامة", style: "مرتل", bitrate: "128k" },
  { id: "Yasser_Ad-Dussary_128kbps", name: "ياسر الدوسري", style: "مرتل", bitrate: "128k" },
  { id: "AbdulSamad_64kbps_QuranExplorer.Com", name: "عبد الباسط عبد الصمد", style: "QuranExplorer", bitrate: "64k" },
  { id: "warsh/warsh_ibrahim_aldosary_128kbps", name: "إبراهيم الدوسري (ورش)", style: "ورش", bitrate: "128k" },
  { id: "warsh/warsh_yassin_al_jazaery_64kbps", name: "ياسين الجزائري (ورش)", style: "ورش", bitrate: "64k" },
];

export const surahs = [
  { id: 1, name: "الفاتحة", ayahCount: 7 },
  { id: 2, name: "البقرة", ayahCount: 286 },
  { id: 3, name: "آل عمران", ayahCount: 200 },
  { id: 4, name: "النساء", ayahCount: 176 },
  { id: 5, name: "المائدة", ayahCount: 120 },
  { id: 6, name: "الأنعام", ayahCount: 165 },
  { id: 7, name: "الأعراف", ayahCount: 206 },
  { id: 8, name: "الأنفال", ayahCount: 75 },
  { id: 9, name: "التوبة", ayahCount: 129 },
  { id: 10, name: "يونس", ayahCount: 109 },
  { id: 11, name: "هود", ayahCount: 123 },
  { id: 12, name: "يوسف", ayahCount: 111 },
  { id: 13, name: "الرعد", ayahCount: 43 },
  { id: 14, name: "إبراهيم", ayahCount: 52 },
  { id: 15, name: "الحجر", ayahCount: 99 },
  { id: 16, name: "النحل", ayahCount: 128 },
  { id: 17, name: "الإسراء", ayahCount: 111 },
  { id: 18, name: "الكهف", ayahCount: 110 },
  { id: 19, name: "مريم", ayahCount: 98 },
  { id: 20, name: "طه", ayahCount: 135 },
  { id: 21, name: "الأنبياء", ayahCount: 112 },
  { id: 22, name: "الحج", ayahCount: 78 },
  { id: 23, name: "المؤمنون", ayahCount: 118 },
  { id: 24, name: "النور", ayahCount: 64 },
  { id: 25, name: "الفرقان", ayahCount: 77 },
  { id: 26, name: "الشعراء", ayahCount: 227 },
  { id: 27, name: "النمل", ayahCount: 93 },
  { id: 28, name: "القصص", ayahCount: 88 },
  { id: 29, name: "العنكبوت", ayahCount: 69 },
  { id: 30, name: "الروم", ayahCount: 60 },
  { id: 36, name: "يس", ayahCount: 83 },
  { id: 55, name: "الرحمن", ayahCount: 78 },
  { id: 56, name: "الواقعة", ayahCount: 96 },
  { id: 67, name: "الملك", ayahCount: 30 },
  { id: 78, name: "النبأ", ayahCount: 40 },
  { id: 112, name: "الإخلاص", ayahCount: 4 },
  { id: 113, name: "الفلق", ayahCount: 5 },
  { id: 114, name: "الناس", ayahCount: 6 },
];

export const aspectRatios = [
  { id: "9:16", label: "9:16 ريلز", width: 1080, height: 1920 },
  { id: "16:9", label: "16:9 يوتيوب", width: 1920, height: 1080 },
  { id: "1:1", label: "1:1 مربع", width: 1080, height: 1080 },
];

export const transitions = [
  { id: "none", label: "بدون انتقال" },
  { id: "fade", label: "تلاشٍ ناعم" },
  { id: "slide", label: "انزلاق جانبي" },
  { id: "zoom", label: "تكبير سينمائي" },
  { id: "blur", label: "ضباب نوراني" },
  { id: "kenburns", label: "كين بيرنز" },
] as const;
export type TransitionId = typeof transitions[number]["id"];

export const visualizers = [
  { id: "none", label: "بدون مؤثرات" },
  { id: "bars", label: "أعمدة تفاعلية" },
  { id: "wave", label: "موجة صوتية" },
  { id: "circle", label: "نبضة دائرية" },
  { id: "particles", label: "جسيمات نورانية" },
] as const;
export type VisualizerId = typeof visualizers[number]["id"];

export const exportStatuses = {
  pending: "قيد الانتظار",
  processing: "جاري المعالجة",
  completed: "مكتمل",
  failed: "فشل",
} as const;

export type ExportStatus = keyof typeof exportStatuses;
