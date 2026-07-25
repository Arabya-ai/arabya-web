import { auth } from "@/auth";
import { getSurah, getVerseTranslation } from "@/lib/quran";
import { getSurahDisplayTitle } from "@/lib/surah-names";
import { renderCreateAyahPng } from "@/lib/create-ayah-image";
import {
  canCreatePremiumImage,
  FREE_IMAGE_ASPECT,
  PLUS_IMAGE_ASPECTS,
  type ImageAspect,
  type UserPlan,
} from "@/lib/plans";
import { normalizeForHafsFont } from "@/lib/quran-text";

export const runtime = "nodejs";

function parseAspect(raw: string | null, plan: UserPlan): ImageAspect {
  const a = (raw || FREE_IMAGE_ASPECT) as ImageAspect;
  if (plan === "free") return FREE_IMAGE_ASPECT;
  if (PLUS_IMAGE_ASPECTS.includes(a)) return a;
  return FREE_IMAGE_ASPECT;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "auth_required" }, { status: 401 });
  }
  const plan = session.user.plan ?? "free";
  const { searchParams } = new URL(request.url);
  const sid = Number(searchParams.get("s") || "0");
  const vid = Number(searchParams.get("v") || "0");
  const locale = searchParams.get("locale") === "en" ? "en" : "ar";
  const edition = searchParams.get("edition") || "";
  const wantTr = searchParams.get("tr") === "1";
  const bg = searchParams.get("bg") || "";

  if (
    !Number.isInteger(sid) ||
    sid < 1 ||
    sid > 114 ||
    !Number.isInteger(vid) ||
    vid < 1
  ) {
    return Response.json({ error: "bad_verse" }, { status: 400 });
  }

  const aspect = parseAspect(searchParams.get("aspect"), plan);
  const premium = canCreatePremiumImage(plan);
  if ((aspect !== FREE_IMAGE_ASPECT || (bg && bg !== "")) && !premium) {
    return Response.json({ error: "plus_required" }, { status: 403 });
  }

  const surah = await getSurah(sid);
  if (!surah) return Response.json({ error: "not_found" }, { status: 404 });
  const ayah = surah.verses.find((x) => x.verseNumber === vid);
  if (!ayah) return Response.json({ error: "not_found" }, { status: 404 });

  const ayahText = ayah.words
    .filter((w) => !w.charType || w.charType === "word")
    .map((w) => normalizeForHafsFont(w.text))
    .join(" ");

  let translation = "";
  if (wantTr && edition) {
    const file = await getVerseTranslation(edition, sid);
    translation =
      file?.verses.find((x) => x.verseNumber === vid)?.text?.trim() || "";
  }

  const png = await renderCreateAyahPng({
    aspect,
    surahTitle: getSurahDisplayTitle(sid, locale),
    verseLabel: String(vid),
    ayahText,
    translation: translation || undefined,
    watermark: !premium,
    backgroundColor: premium && bg.startsWith("#") ? bg : undefined,
    locale,
  });

  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename="arabya-${sid}-${vid}.png"`,
    },
  });
}
