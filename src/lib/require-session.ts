import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { redirectLocalized } from "@/i18n/locale-params";
import {
  defaultLocale,
  isAppLocale,
  type AppLocale,
} from "@/i18n/routing";

/** Server-side auth gate (Node). Use on protected layouts/pages. */
export async function requireSession() {
  const raw = await getLocale();
  const locale: AppLocale = isAppLocale(raw) ? raw : defaultLocale;
  const session = await auth();
  if (!session?.user || session.error === "Banned") {
    redirectLocalized("/login", locale);
  }
  return { session, locale };
}
