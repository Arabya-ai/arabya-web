import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { CreateImageClient } from "@/components/create/CreateImageClient";
import { Link } from "@/i18n/navigation";
import {
  redirectLocalized,
  resolveLocale,
} from "@/i18n/locale-params";
import { getSurahs, getVerseTranslationEditions } from "@/lib/quran";
import { getSurahDisplayName } from "@/lib/surah-names";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ s?: string; v?: string }>;
};

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Create" });
  return { title: t("imageMetaTitle"), description: t("imageMetaDescription") };
}

export default async function CreateImagePage({ params, searchParams }: Props) {
  const locale = await resolveLocale(params);
  const session = await auth();
  if (!session?.user) redirectLocalized("/login?callbackUrl=/create/image", locale);

  const sp = await searchParams;
  const initialSurah = Math.min(114, Math.max(1, Number(sp.s) || 1));
  const initialVerse = Math.max(1, Number(sp.v) || 1);
  const t = await getTranslations("Create");
  const tNav = await getTranslations("Nav");
  const [surahs, editions] = await Promise.all([
    getSurahs(),
    getVerseTranslationEditions(),
  ]);

  return (
    <div className="shell page-block">
      <nav className="surah-nav" aria-label={t("navAria")}>
        <Link href="/create" className="nav-pill">
          {t("hub")}
        </Link>
        <Link href="/" className="nav-pill">
          {tNav("index")}
        </Link>
        <Link href="/pricing" className="nav-pill">
          {t("pricing")}
        </Link>
      </nav>
      <h1>{t("imageTitle")}</h1>
      <p className="dash-muted">{t("imageLead")}</p>
      <CreateImageClient
        plan={session.user.plan ?? "free"}
        initialSurah={initialSurah}
        initialVerse={initialVerse}
        surahs={surahs.map((s) => ({
          id: s.id,
          name: getSurahDisplayName(s.id, locale),
          versesCount: s.versesCount,
        }))}
        editions={editions.map((e) => ({
          slug: e.slug,
          name: e.nameNative || (locale === "en" ? e.nameEn : e.nameAr),
        }))}
      />
    </div>
  );
}
