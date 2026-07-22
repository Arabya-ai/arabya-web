import { getMushafPage } from "@/lib/mushaf";
import { getRootEntry, getSurah } from "@/lib/quran";
import { toArabicNumerals } from "@/lib/format";
import { getSurahUthmaniTitle } from "@/lib/surah-names";
import { renderOgCardLatin } from "@/lib/og-card";
import { renderOgCard } from "@/lib/og-card-arabic";
import type { ShareKind } from "@/lib/share";

export const runtime = "nodejs";

function kindEyebrow(kind: ShareKind): string {
  switch (kind) {
    case "ayah":
      return "مشاركة آية";
    case "page":
      return "مشاركة صفحة المصحف";
    case "surah":
      return "مشاركة سورة";
    case "listen-ayah":
      return "استماع آية";
    case "listen-surah":
      return "استماع سورة";
    case "listen-wbw":
      return "استماع كلمة بكلمة";
    case "note":
      return "ملاحظة على آية";
    case "irab":
      return "إعراب آية";
    case "root":
      return "جذر قرآني";
    default:
      return "عربية";
  }
}

function kindEyebrowLatin(kind: ShareKind): string {
  switch (kind) {
    case "ayah":
      return "Share ayah";
    case "page":
      return "Share mushaf page";
    case "surah":
      return "Share surah";
    case "listen-ayah":
      return "Listen ayah";
    case "listen-surah":
      return "Listen surah";
    case "listen-wbw":
      return "Word-by-word audio";
    case "note":
      return "Ayah note";
    case "irab":
      return "Ayah iʿrāb";
    case "root":
      return "Quranic root";
    default:
      return "Arabya";
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const kind = (searchParams.get("kind") || "page") as ShareKind;
  const pageNum = Number(searchParams.get("page") || "0");
  const verseKey = searchParams.get("v") || "";
  const surahIdParam = Number(searchParams.get("sid") || "0");
  const rootQ = searchParams.get("root") || "";
  const verseMatch = verseKey.match(/^(\d{1,3}):(\d{1,3})$/);

  let title = "عربية";
  let subtitle = "تفسير كلمات القرآن الكريم";
  let ayahLine = "";
  let titleLatin = "Arabya";
  let subtitleLatin = "Quran word study";
  const eyebrow = kindEyebrow(kind);

  try {
    if (kind === "root" && rootQ) {
      const entry = await getRootEntry(decodeURIComponent(rootQ));
      title = `الجذر ${entry?.root ?? decodeURIComponent(rootQ)}`;
      subtitle = entry
        ? `${toArabicNumerals(entry.count)} موضعًا في القرآن`
        : "مواضع الجذر في القرآن";
      titleLatin = entry
        ? `Root · ${entry.count} occurrences`
        : "Quranic root";
      subtitleLatin = "Browse on Arabya";
    } else if (kind === "irab" && verseMatch) {
      const sid = Number(verseMatch[1]);
      const vid = Number(verseMatch[2]);
      title = `إعراب ${getSurahUthmaniTitle(sid)} ${toArabicNumerals(vid)}`;
      subtitle = "إعراب مفصّل كلمة بكلمة";
      titleLatin = `Surah ${sid} · ayah ${vid}`;
      subtitleLatin = "Word-by-word iʿrāb";
      const content = await getSurah(sid);
      const ayah = content?.verses.find((v) => v.verseNumber === vid);
      if (ayah) {
        ayahLine = ayah.words
          .filter((w) => !w.charType || w.charType === "word")
          .slice(0, 12)
          .map((w) => w.text)
          .join(" ");
        if (ayah.words.length > 12) ayahLine += " …";
      }
    } else if (Number.isInteger(pageNum) && pageNum >= 1 && pageNum <= 604) {
      const content = await getMushafPage(pageNum);
      const sid = verseMatch
        ? Number(verseMatch[1])
        : surahIdParam || content?.blocks[0]?.surahId || 1;
      const vid = verseMatch ? Number(verseMatch[2]) : 0;
      const block = content?.blocks.find((b) => b.surahId === sid);
      const verse =
        vid > 0
          ? block?.verses.find((x) => x.verseNumber === vid)
          : block?.verses[0];

      if (kind === "page") {
        title = `صفحة ${toArabicNumerals(pageNum)}`;
        subtitle =
          content?.blocks.length === 1
            ? getSurahUthmaniTitle(content.blocks[0].surahId)
            : "مصحف المدينة";
        titleLatin = `Page ${pageNum}`;
        subtitleLatin = `Surah ${sid}`;
      } else if (kind === "surah" || kind === "listen-surah") {
        title = getSurahUthmaniTitle(sid);
        subtitle =
          kind === "listen-surah"
            ? "استمع لتلاوة السورة على عربية"
            : `دراسة السورة · صفحة ${toArabicNumerals(pageNum)}`;
        titleLatin = `Surah ${sid}`;
        subtitleLatin =
          kind === "listen-surah" ? "Listen on Arabya" : `Page ${pageNum}`;
      } else if (
        kind === "ayah" ||
        kind === "listen-ayah" ||
        kind === "listen-wbw" ||
        kind === "note"
      ) {
        title = `${getSurahUthmaniTitle(sid)} ${toArabicNumerals(vid || 1)}`;
        titleLatin = `Surah ${sid} · ayah ${vid || 1}`;
        if (kind === "listen-ayah") {
          subtitle = "استمع للآية على عربية";
          subtitleLatin = "Listen ayah";
        } else if (kind === "listen-wbw") {
          subtitle = "استمع كلمة بكلمة على عربية";
          subtitleLatin = "Word-by-word audio";
        } else if (kind === "note") {
          subtitle = "ملاحظة مع الآية";
          subtitleLatin = "Ayah note";
        } else {
          subtitle = "دراسة الآية والإعراب";
          subtitleLatin = "Study ayah";
        }
        if (verse) {
          ayahLine = verse.words
            .slice(0, 12)
            .map((w) => w.text)
            .join(" ");
          if (verse.words.length > 12) ayahLine += " …";
        }
      } else {
        title = `صفحة ${toArabicNumerals(pageNum)}`;
        subtitle = getSurahUthmaniTitle(sid);
        titleLatin = `Page ${pageNum}`;
        subtitleLatin = `Surah ${sid}`;
      }
    }
  } catch {
    /* keep defaults */
  }

  try {
    return await renderOgCard({
      eyebrow,
      title,
      subtitle,
      ayahLine: ayahLine || undefined,
      footer: "دراسة كلمات القرآن",
    });
  } catch {
    return renderOgCardLatin({
      eyebrow: kindEyebrowLatin(kind),
      title: titleLatin,
      subtitle: subtitleLatin,
      footer: "arabyaai.com",
    });
  }
}
