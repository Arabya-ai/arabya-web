import { getLocale } from "next-intl/server";
import { auth } from "@/auth";
import { redirectLocalized } from "@/i18n/locale-params";
import {
  defaultLocale,
  isAppLocale,
  type AppLocale,
} from "@/i18n/routing";
import { canAccessAdmin, type UserRole } from "@/lib/roles";

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

/** Admin area pages: session + not banned + role verified + admin rank. */
export async function requireAdminPage() {
  const { session, locale } = await requireSession();
  if (session.user?.roleUnverified) {
    redirectLocalized("/account", locale);
  }
  const role = (session.user?.role ?? "member") as UserRole;
  if (!canAccessAdmin(role)) {
    redirectLocalized("/account", locale);
  }
  return { session, locale };
}
