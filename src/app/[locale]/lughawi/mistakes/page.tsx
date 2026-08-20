import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Lughawi" });
  return {
    title: t("mistakesPageTitle"),
    description: t("mistakesPageLead"),
  };
}

export default async function LughawiMistakesPage({ params }: Props) {
  await resolveLocale(params);
  const t = await getTranslations("Lughawi");

  const items = [
    { title: t("mistakeHamza"), bodyKey: "hamza-ana" as const },
    { title: t("mistakeTa"), bodyKey: "ta-marbuta" as const },
    { title: t("mistakeAlef"), bodyKey: "alef-farq" as const },
    { title: t("mistakeSolar"), bodyKey: "agreement-demo" as const },
  ];

  return (
    <div className="shell page-block lughawi-page">
      <header className="lughawi-hero">
        <p className="lughawi-kicker">{t("kicker")}</p>
        <h1>{t("mistakesPageTitle")}</h1>
        <p className="lughawi-hero-lead">{t("mistakesPageLead")}</p>
        <nav className="lughawi-local-nav" aria-label={t("title")}>
          <Link href="/lughawi" className="nav-pill">
            {t("navTool")}
          </Link>
          <Link href="/lughawi/features" className="nav-pill">
            {t("navFeatures")}
          </Link>
          <Link href="/lughawi/mistakes" className="nav-pill is-current" aria-current="page">
            {t("navMistakes")}
          </Link>
        </nav>
      </header>

      <div className="lughawi-sections">
        <section>
          <div className="lughawi-feature-row">
            {items.map((item) => (
              <article key={item.bodyKey}>
                <h3>{item.title}</h3>
                <p>
                  {item.bodyKey === "hamza-ana"
                    ? "أنا / إلى / الآن — همزات شائعة يصلحها لغوي مع شرح القاعدة."
                    : item.bodyKey === "ta-marbuta"
                      ? "مدرسة لا مدرسه في الكتابة الفصحى حين تكون تاء مربوطة."
                      : item.bodyKey === "alef-farq"
                        ? "واو الجماعة في الأفعال تُتبع غالبًا بألف التفريق: كتبوا."
                        : "ال التعريف مع الحروف الشمسية والقمرية موضوع نطقي/كتابي متكرر."}
                </p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
