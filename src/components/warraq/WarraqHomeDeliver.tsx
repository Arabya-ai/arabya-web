import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function WarraqHomeDeliver() {
  const t = await getTranslations("WarraqHome");

  return (
    <section className="wrq-deliver" aria-labelledby="wrq-deliver-title">
      <p className="wrq-deliver__badge">{t("deliverBadge")}</p>
      <h2 id="wrq-deliver-title">{t("deliverTitle")}</h2>
      <p className="wrq-deliver__lead">{t("deliverLead")}</p>
      <div className="wrq-deliver__stats">
        <div>
          <strong>{t("stat1Value")}</strong>
          <span>{t("stat1Label")}</span>
        </div>
        <div>
          <strong>{t("stat2Value")}</strong>
          <span>{t("stat2Label")}</span>
        </div>
        <div>
          <strong>{t("stat3Value")}</strong>
          <span>{t("stat3Label")}</span>
        </div>
      </div>
      <Link href="/about" className="wrq-btn wrq-btn--ghost-on-dark">
        {t("deliverCta")}
      </Link>
    </section>
  );
}
