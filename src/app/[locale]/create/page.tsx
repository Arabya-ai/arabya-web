import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import {
  studioCreateFromAyahHref,
  studioPath,
} from "@/ayat-studio/lib/studio-paths";
import { ArabyaHubHero, ArabyaHubPage } from "@/components/hub/ArabyaHubShell";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Create" });
  return { title: t("hubMetaTitle"), description: t("hubMetaDescription") };
}

export default async function CreateHubPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Create" });
  const th = await getTranslations({ locale, namespace: "ServicesHub" });

  return (
    <ArabyaHubPage>
      <ArabyaHubHero
        icon="studio"
        iconLabel={t("hubTitle")}
        title={t("hubTitle")}
        lead={t("hubLead")}
        nav={[
          { href: "/", label: th("backHome") },
          { href: "/pricing", label: t("pricing") },
          { href: "/studio", label: th("items.studio.title") },
          { href: "/services", label: th("viewAll") },
        ]}
      />
      <ul className="create-hub-list">
        <li>
          <Link
            href={studioCreateFromAyahHref({
              surahId: 1,
              verse: 1,
              kind: "image",
              auto: false,
            })}
            className="create-hub-card"
          >
            <strong>{t("imageTitle")}</strong>
            <span>{t("imageLead")}</span>
          </Link>
        </li>
        <li>
          <Link
            href={studioCreateFromAyahHref({
              surahId: 1,
              verse: 1,
              kind: "video",
              auto: false,
            })}
            className="create-hub-card"
          >
            <strong>{t("videoTitle")}</strong>
            <span>{t("videoLead")}</span>
          </Link>
        </li>
        <li>
          <Link href={studioPath("/projects/new")} className="create-hub-card">
            <strong>{th("items.studio.title")}</strong>
            <span>{t("hubLead")}</span>
          </Link>
        </li>
      </ul>
    </ArabyaHubPage>
  );
}
