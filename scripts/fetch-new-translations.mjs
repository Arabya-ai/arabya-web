/**
 * Fetch verse translations that are missing locally (Quran.com API v4).
 * Usage: node scripts/fetch-new-translations.mjs
 * Optional: node scripts/fetch-new-translations.mjs saheeh-en bubenheim-de
 */
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const transDir = path.join(root, "data", "translations");

/** @typedef {{ slug: string; resourceId: number; nameNative: string; nameEn: string; lang: string; nameAr?: string }} Edition */

/** @type {Edition[]} */
export const VERSE_EDITIONS = [
  {
    slug: "saheeh-en",
    resourceId: 20,
    nameNative: "Saheeh International (English)",
    nameEn: "Saheeh International",
    lang: "en",
    nameAr: "صحيح إنترناشونال",
  },
  {
    slug: "pickthall-en",
    resourceId: 19,
    nameNative: "M. Pickthall (English)",
    nameEn: "M. Pickthall",
    lang: "en",
    nameAr: "بكثال",
  },
  {
    slug: "clear-en",
    resourceId: 131,
    nameNative: "The Clear Quran (English)",
    nameEn: "Dr. Mustafa Khattab — The Clear Quran",
    lang: "en",
    nameAr: "القرآن الواضح",
  },
  {
    slug: "hamidullah-fr",
    resourceId: 31,
    nameNative: "Muhammad Hamidullah (Français)",
    nameEn: "Muhammad Hamidullah",
    lang: "fr",
    nameAr: "حميد الله",
  },
  {
    slug: "bubenheim-de",
    resourceId: 27,
    nameNative: "Bubenheim & Elyas (Deutsch)",
    nameEn: "Frank Bubenheim and Nadeem Elyas",
    lang: "de",
    nameAr: "بوبنهايم",
  },
  {
    slug: "isa-garcia-es",
    resourceId: 83,
    nameNative: "Isa García (Español)",
    nameEn: "Sheikh Isa Garcia",
    lang: "es",
    nameAr: "عيسى غارسيا",
  },
  {
    slug: "piccardo-it",
    resourceId: 153,
    nameNative: "Hamza Roberto Piccardo (Italiano)",
    nameEn: "Hamza Roberto Piccardo",
    lang: "it",
    nameAr: "بيكارو",
  },
  {
    slug: "samir-pt",
    resourceId: 43,
    nameNative: "Samir (Português)",
    nameEn: "Portuguese Translation (Samir)",
    lang: "pt",
    nameAr: "سمير",
  },
  {
    slug: "abdalsalaam-nl",
    resourceId: 235,
    nameNative: "Abdalsalaam (Nederlands)",
    nameEn: "Malak Faris Abdalsalaam",
    lang: "nl",
    nameAr: "عبدالسلام",
  },
  {
    slug: "knut-sv",
    resourceId: 48,
    nameNative: "Knut Bernström (Svenska)",
    nameEn: "Knut Bernström",
    lang: "sv",
    nameAr: "كنوت",
  },
  {
    slug: "kuliev-ru",
    resourceId: 45,
    nameNative: "Эльмир Кулиев (Русский)",
    nameEn: "Elmir Kuliev",
    lang: "ru",
    nameAr: "كولييف",
  },
  {
    slug: "indonesian",
    resourceId: 33,
    nameNative: "Kemenag RI (Bahasa Indonesia)",
    nameEn: "Indonesian Ministry of Religious Affairs",
    lang: "id",
    nameAr: "وزارة الشؤون الدينية الإندونيسية",
  },
  {
    slug: "basmeih-ms",
    resourceId: 39,
    nameNative: "Abdullah Basmeih (Bahasa Melayu)",
    nameEn: "Abdullah Muhammad Basmeih",
    lang: "ms",
    nameAr: "بسمييه",
  },
  {
    slug: "turkish",
    resourceId: 77,
    nameNative: "Diyanet İşleri (Türkçe)",
    nameEn: "Turkish (Diyanet)",
    lang: "tr",
    nameAr: "ديانت",
  },
  {
    slug: "junagarhi-ur",
    resourceId: 54,
    nameNative: "مولانا محمد جوناگڑھی (اردو)",
    nameEn: "Maulana Muhammad Junagarhi",
    lang: "ur",
    nameAr: "جوناغري",
  },
  {
    slug: "taisirul-bn",
    resourceId: 161,
    nameNative: "তাইসিরুল কুরআন (বাংলা)",
    nameEn: "Taisirul Quran",
    lang: "bn",
    nameAr: "تيسير القرآن",
  },
  {
    slug: "umari-hi",
    resourceId: 122,
    nameNative: "मौलाना अज़ीज़ुल हक़ (हिन्दी)",
    nameEn: "Maulana Azizul Haque al-Umari",
    lang: "hi",
    nameAr: "العمري",
  },
  {
    slug: "ma-jain-zh",
    resourceId: 56,
    nameNative: "马坚译（中文）",
    nameEn: "Chinese Translation (Ma Jian)",
    lang: "zh",
    nameAr: "ما جيان",
  },
  {
    slug: "mita-ja",
    resourceId: 35,
    nameNative: "三田了一（日本語）",
    nameEn: "Ryoichi Mita",
    lang: "ja",
    nameAr: "ميتا",
  },
  {
    slug: "korean-ko",
    resourceId: 36,
    nameNative: "한국어 번역",
    nameEn: "Korean",
    lang: "ko",
    nameAr: "كوري",
  },
  {
    slug: "gumi-ha",
    resourceId: 32,
    nameNative: "Abubakar Mahmoud Gumi (Hausa)",
    nameEn: "Hausa Translation (Abubakar Gumi)",
    lang: "ha",
    nameAr: "غومي",
  },
  {
    slug: "barwani-sw",
    resourceId: 49,
    nameNative: "Ali Muhsin Al-Barwani (Kiswahili)",
    nameEn: "Ali Muhsin Al-Barwani",
    lang: "sw",
    nameAr: "البرواني",
  },
  {
    slug: "mehanovic-bs",
    resourceId: 25,
    nameNative: "Muhamed Mehanović (Bosanski)",
    nameEn: "Muhamed Mehanović",
    lang: "bs",
    nameAr: "مهانوفيتش",
  },
  {
    slug: "ahmeti-sq",
    resourceId: 89,
    nameNative: "Sherif Ahmeti (Shqip)",
    nameEn: "Albanian Translation (Ahmeti)",
    lang: "sq",
    nameAr: "أحمتي",
  },
];

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "arabya-web-translations",
    },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function fetchVerse(chapterId, resourceId) {
  const data = await fetchJson(
    `https://api.quran.com/api/v4/quran/translations/${resourceId}?chapter_number=${chapterId}`,
  );
  return (data.translations || []).map((t, i) => ({
    verseNumber: i + 1,
    verseKey: `${chapterId}:${i + 1}`,
    text: stripHtml(t.text),
  }));
}

async function writeIndex() {
  await writeFile(
    path.join(transDir, "index.json"),
    JSON.stringify(
      {
        wordByWord: [
          {
            field: "meaningAr",
            lang: "ar",
            nameNative: "عربي",
            nameAr: "عربي",
            source: "Arabya lemma-sense",
          },
          {
            field: "meaning",
            lang: "en",
            nameNative: "English",
            nameAr: "إنجليزي",
            source: "Quran.com WBW",
          },
          {
            field: "meaningId",
            lang: "id",
            nameNative: "Bahasa Indonesia",
            nameAr: "إندونيسي",
            source: "Quran.com WBW",
          },
          {
            field: "meaningUr",
            lang: "ur",
            nameNative: "اردو",
            nameAr: "أردو",
            source: "Quran.com WBW",
          },
        ],
        verseEditions: VERSE_EDITIONS.map((e) => ({
          slug: e.slug,
          resourceId: e.resourceId,
          nameNative: e.nameNative,
          nameAr: e.nameAr ?? e.nameNative,
          nameEn: e.nameEn,
          lang: e.lang,
          source: "Quran.com",
          sourceUrl: "https://api.quran.com",
        })),
        arabicWbwNote:
          "No open Arabic word-by-word meaning dataset is currently available via Quran.com. English/Indonesian/Urdu WBW are included; Arabic study senses use lemma-sense-ar.json.",
      },
      null,
      2,
    ),
    "utf8",
  );
}

async function main() {
  await mkdir(transDir, { recursive: true });
  const only = new Set(process.argv.slice(2).filter(Boolean));
  const editions = only.size
    ? VERSE_EDITIONS.filter((e) => only.has(e.slug))
    : VERSE_EDITIONS;

  for (const ed of editions) {
    const dir = path.join(transDir, ed.slug);
    await mkdir(dir, { recursive: true });
    let wrote = 0;
    for (let id = 1; id <= 114; id += 1) {
      const file = path.join(dir, `${id}.json`);
      if (await exists(file)) continue;
      const verses = await fetchVerse(id, ed.resourceId);
      await writeFile(
        file,
        JSON.stringify({
          id,
          slug: ed.slug,
          resourceId: ed.resourceId,
          nameNative: ed.nameNative,
          nameAr: ed.nameAr ?? ed.nameNative,
          nameEn: ed.nameEn,
          lang: ed.lang,
          source: "Quran.com API v4",
          sourceUrl: "https://quran.com",
          verses,
        }),
      );
      wrote += 1;
      if (wrote % 20 === 0 || id === 114) {
        console.log(`${ed.slug}: wrote through ${id} (+${wrote} new)`);
      }
    }
    if (wrote === 0) console.log(`${ed.slug}: already complete`);
  }

  await writeIndex();
  console.log("Updated data/translations/index.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
