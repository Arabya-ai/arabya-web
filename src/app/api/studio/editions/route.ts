import { getTafsirSources, getVerseTranslationEditions } from "@/lib/quran";
import { enforceRateLimitKey } from "@/lib/rate-limit";
import { requireSession } from "@/lib/require-role";

export const runtime = "nodejs";

/** Authenticated catalog of translation + tafsir editions for Arabya Studio. */
export async function GET() {
  const gate = await requireSession();
  if ("error" in gate) return gate.error;
  const limited = enforceRateLimitKey("studio-editions", gate.email, 60);
  if (limited) return limited;

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
