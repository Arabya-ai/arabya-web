import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export async function WarraqHomeHero() {
  const t = await getTranslations("WarraqHome");

  return (
    <section className="wrq-hero" aria-labelledby="wrq-hero-title">
      <div className="wrq-hero__bg" aria-hidden="true" />
      <div className="wrq-hero__grid">
        <div className="wrq-hero__copy">
          <div className="wrq-pill wrq-pill--live">
            <span className="wrq-pill__dot" aria-hidden="true" />
            {t("badge")}
          </div>

          <div className="wrq-os-row" aria-label={t("platformsAria")}>
            <div className="wrq-os-card">
              <span className="wrq-os-card__icon" aria-hidden="true">🌐</span>
              <span>
                <strong>{t("webLabel")}</strong>
                <small>{t("webStatus")}</small>
              </span>
            </div>
            <div className="wrq-os-card">
              <span className="wrq-os-card__icon" aria-hidden="true">📱</span>
              <span>
                <strong>{t("mobileLabel")}</strong>
                <small>{t("mobileStatus")}</small>
              </span>
            </div>
            <div className="wrq-os-card wrq-os-card--soon">
              <span className="wrq-os-card__icon" aria-hidden="true">🖥</span>
              <span>
                <strong>{t("desktopLabel")}</strong>
                <small>{t("desktopStatus")}</small>
              </span>
            </div>
          </div>

          <p className="wrq-kicker">{t("kicker")}</p>
          <h1 id="wrq-hero-title" className="wrq-hero__title">
            <span className="wrq-hero__title-muted">{t("titlePrefix")}</span>
            <span className="wrq-hero__title-gold">{t("titleBrand")}</span>
            <span className="wrq-hero__title-muted wrq-hero__title-line">
              {t("titleSuffix")}
            </span>
          </h1>
          <p className="wrq-hero__lead">{t("lead")}</p>
          <div className="wrq-hero__actions">
            <Link href="/services" className="wrq-btn wrq-btn--gold">
              {t("ctaExplore")}
            </Link>
            <Link href="/lughawi" className="wrq-btn wrq-btn--outline">
              {t("ctaLughawi")}
            </Link>
          </div>
          <ul className="wrq-trust" aria-label={t("trustAria")}>
            <li>{t("trust1")}</li>
            <li>{t("trust2")}</li>
            <li>{t("trust3")}</li>
          </ul>
        </div>

        <aside className="wrq-mockup" aria-label={t("mockupAria")}>
          <div className="wrq-mockup__chrome" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <p className="wrq-mockup__brand">{t("mockupBrand")}</p>
          <h2 className="wrq-mockup__title">{t("mockupTitle")}</h2>
          <p className="wrq-mockup__body">{t("mockupBody")}</p>
          <div className="wrq-mockup__actions">
            <Link href="/lughawi" className="wrq-btn wrq-btn--gold wrq-btn--sm">
              {t("mockupCta1")}
            </Link>
            <Link href="/mushaf/1" className="wrq-btn wrq-btn--teal wrq-btn--sm">
              {t("mockupCta2")}
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
