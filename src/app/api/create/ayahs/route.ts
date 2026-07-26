import { auth } from "@/auth";
import { getSurah } from "@/lib/quran";
import { normalizeForHafsFont } from "@/lib/quran-text";
import {
  STUDIO_MAX_AYAHS,
  canExportUnlimitedStudioAyahs,
} from "@/lib/plans";

export const runtime = "nodejs";

/** Authenticated ayah text range for Ayat Studio (local QPC). */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "auth_required" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const sid = Number(searchParams.get("s") || "0");
  const from = Number(searchParams.get("from") || "1");
  const to = Number(searchParams.get("to") || from);
  if (!Number.isInteger(sid) || sid < 1 || sid > 114) {
    return Response.json({ error: "bad_surah" }, { status: 400 });
  }

  const surah = await getSurah(sid);
  if (!surah) return Response.json({ error: "not_found" }, { status: 404 });

  const start = Math.min(
    surah.versesCount,
    Math.max(1, Number.isFinite(from) ? from : 1),
  );
  const end = Math.min(
    surah.versesCount,
    Math.max(start, Number.isFinite(to) ? to : start),
  );
  const unlimited = canExportUnlimitedStudioAyahs(
    (session.user.role as "member" | "creator" | "editor" | "admin") || "member",
    session.user.email,
  );
  if (!unlimited && end - start + 1 > STUDIO_MAX_AYAHS) {
    return Response.json({ error: "range_too_long" }, { status: 400 });
  }

  const ayahs: Record<number, string> = {};
  for (const v of surah.verses) {
    if (v.verseNumber < start || v.verseNumber > end) continue;
    ayahs[v.verseNumber] = v.words
      .filter((w) => !w.charType || w.charType === "word")
      .map((w) => normalizeForHafsFont(w.text))
      .join(" ");
  }

  if (Object.keys(ayahs).length === 0) {
    return Response.json({ error: "empty_range" }, { status: 400 });
  }

  return Response.json({
    surahId: sid,
    from: start,
    to: end,
    ayahs,
  });
}
