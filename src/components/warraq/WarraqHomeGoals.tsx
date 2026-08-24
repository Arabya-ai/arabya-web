import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

const GOAL_KEYS = ["g1", "g2", "g3", "g4", "g5"] as const;

export async function WarraqHomeGoals() {
  const t = await getTranslations("WarraqHome");

  return (
    <section className="wrq-goals" aria-labelledby="wrq-goals-title">
      <div className="wrq-goals__head">
        <p className="wrq-kicker wrq-kicker--on-dark">{t("goalsKicker")}</p>
        <h2 id="wrq-goals-title">{t("goalsTitle")}</h2>
        <p className="wrq-goals__lead">{t("goalsLead")}</p>
      </div>
      <div className="wrq-goals__grid">
        {GOAL_KEYS.map((key, i) => (
          <article key={key} className="wrq-goal-card">
            <span className="wrq-goal-card__num" aria-hidden="true">
              {(i + 1).toLocaleString("ar-EG")}
            </span>
            <h3>{t(`${key}Title`)}</h3>
            <p>{t(`${key}Body`)}</p>
            <p className="wrq-goal-card__status">{t(`${key}Status`)}</p>
          </article>
        ))}
      </div>
      <div className="wrq-goals__cta">
        <Link href="/about" className="wrq-btn wrq-btn--gold">
          {t("goalsCta")}
        </Link>
      </div>
    </section>
  );
}
