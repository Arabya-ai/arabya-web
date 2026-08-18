import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

type AdhkarSection = "hub" | "duas" | "tasbeeh" | "qibla" | "category";

const LINKS: { href: string; key: "hub" | "duas" | "tasbeeh" | "qibla" }[] = [
  { href: "/adhkar", key: "hub" },
  { href: "/adhkar/duas", key: "duas" },
  { href: "/adhkar/tasbeeh", key: "tasbeeh" },
  { href: "/adhkar/qibla", key: "qibla" },
];

export async function AdhkarLocalNav({
  locale,
  current,
}: {
  locale: string;
  current: AdhkarSection;
}) {
  const t = await getTranslations({ locale, namespace: "Adhkar" });

  return (
    <nav className="adhkar-local-nav" aria-label={t("navAria")}>
      {LINKS.map((link) => {
        const active = current === link.key;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`nav-pill${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {t(`tools.${link.key}`)}
          </Link>
        );
      })}
    </nav>
  );
}
