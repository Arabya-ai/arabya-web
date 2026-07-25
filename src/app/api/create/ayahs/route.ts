import { auth } from "@/auth";
import { canCreateVideo } from "@/lib/plans";
import { getSurah } from "@/lib/quran";
import { normalizeForHafsFont } from "@/lib/quran-text";

export const runtime = "nodejs";

/** Authenticated ayah text range for the video studio (local QPC). */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "auth_required" }, { status: 401 });
  }
  if (!canCreateVideo(session.user.plan ?? "free")) {
    return Response.json({ error: "plus_required" }, { status: 403 });
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

  const start = Math.max(1, from);
  const end = Math.min(surah.versesCount, Math.max(start, to));
  if (end - start > 20) {
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

  return Response.json({
    surahId: sid,
    from: start,
    to: end,
    ayahs,
  });
}
