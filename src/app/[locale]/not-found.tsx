import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("Errors");

  return (
    <div className="shell page-block">
      <h1>{t("notFoundTitle")}</h1>
      <p>{t("notFoundMessage")}</p>
      <p>
        <Link href="/">{t("backToIndex")}</Link>
      </p>
    </div>
  );
}
