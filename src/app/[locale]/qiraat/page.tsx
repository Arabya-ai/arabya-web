import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";
import qiraatIndex from "../../../../data/qiraat/index.json";

type Props = { params: Promise<{ locale: string }> };

type Reading = {
  slug: string;
  nameAr: string;
  status: "ready" | "awaiting_license";
  note: string;
};

const NOTE_SLUGS = new Set([
  "hafs",
  "warsh",
  "qalun",
  "shubah",
  "tajweed-color",
]);

const readings = (qiraatIndex.readings ?? []) as Reading[];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Qiraat" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default async function QiraatPage({ params }: Props) {
  const locale = await resolveLocale(params);
  const t = await getTranslations({ locale, namespace: "Qiraat" });

  return (
    <div className="shell page-block">
      <h1>{t("title")}</h1>
      <p>{t.rich("intro", { strong: (c) => <strong>{c}</strong> })}</p>
      <ul className="qiraat-list">
        {readings.map((r) => (
          <li
            key={r.slug}
            className={r.status === "ready" ? "is-ready" : "is-pending"}
          >
            <div className="qiraat-row">
              <strong>{r.nameAr}</strong>
              <span className="qiraat-status">
                {r.status === "ready" ? t("statusReady") : t("statusPending")}
              </span>
            </div>
            <p>
              {NOTE_SLUGS.has(r.slug)
                ? t(`notes.${r.slug}` as "notes.hafs")
                : r.note}
            </p>
            {r.status === "ready" ? (
              <p>
                <Link href="/mushaf/1" className="account-panel-link">
                  {t("openMushaf")}
                </Link>
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      {readings.length === 0 ? (
        <p className="dash-banner dash-banner--warn">
          {t.rich("emptyWarn", {
            code: (c) => <code>{c}</code>,
          })}
        </p>
      ) : null}
    </div>
  );
}
