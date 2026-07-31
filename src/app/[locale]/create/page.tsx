import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Create" });
  return { title: t("hubMetaTitle"), description: t("hubMetaDescription") };
}

export default async function CreateHubPage({ params }: Props) {
  await resolveLocale(params);
  const t = await getTranslations("Create");
  const tNav = await getTranslations("Nav");

  return (
    <div className="shell page-block">
      <nav className="surah-nav">
        <Link href="/" className="nav-pill">
          {tNav("index")}
        </Link>
        <Link href="/pricing" className="nav-pill">
          {t("pricing")}
        </Link>
        <Link href="/studio" className="nav-pill">
          {tNav("studio")}
        </Link>
      </nav>
      <h1>{t("hubTitle")}</h1>
      <p className="dash-muted">{t("hubLead")}</p>
      <ul className="create-hub-list">
        <li>
          <Link href="/create/image" className="create-hub-card">
            <strong>{t("imageTitle")}</strong>
            <span>{t("imageLead")}</span>
          </Link>
        </li>
        <li>
          <Link href="/create/video" className="create-hub-card">
            <strong>{t("videoTitle")}</strong>
            <span>{t("videoLead")}</span>
          </Link>
        </li>
      </ul>
    </div>
  );
}
