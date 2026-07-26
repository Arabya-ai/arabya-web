import { auth } from "@/auth";
import { getTafsirSources, getVerseTranslationEditions } from "@/lib/quran";

export const runtime = "nodejs";

/** Authenticated catalog of translation + tafsir editions for Arabya Studio. */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "auth_required" }, { status: 401 });
  }

  const [translations, tafsirs] = await Promise.all([
    getVerseTranslationEditions(),
    getTafsirSources(),
  ]);

  return Response.json({
    translations: translations.map((t) => ({
      slug: t.slug,
      nameAr: t.nameAr,
      nameEn: t.nameEn,
      lang: t.lang,
    })),
    tafsirs: tafsirs.map((t) => ({
      slug: t.slug,
      nameAr: t.nameAr,
      nameEn: t.nameEn,
      lang: t.lang ?? "ar",
    })),
  });
}
