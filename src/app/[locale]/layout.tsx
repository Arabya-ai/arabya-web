import { CloudflareAnalytics } from "@/components/CloudflareAnalytics";
import {
  Amiri,
  Cairo,
  IBM_Plex_Sans_Arabic,
  Noto_Naskh_Arabic,
  Plus_Jakarta_Sans,
  Reem_Kufi,
  Tajawal,
} from "next/font/google";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { AuthSessionProvider } from "@/components/AuthSessionProvider";
import { AppShell } from "@/components/SiteChrome";
import { SyncUiLocaleFromPath } from "@/components/SyncUiLocaleFromPath";
import {
  isAppLocale,
  localeDirection,
  locales,
  type AppLocale,
} from "@/i18n/routing";
import { getFooterCredit } from "@/lib/site-appearance-store";

/**
 * Keep all 7 families available via CSS variables; preload none of them.
 * Early LCP text uses system-ui; Uthmanic is preloaded only on /mushaf via layout.
 * Preloading every Google family (~25 files) was starving mobile LCP (NO_LCP / 6s+).
 */
const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-ar",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const naskh = Noto_Naskh_Arabic({
  variable: "--font-naskh",
  subsets: ["arabic"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
});

const reemKufi = Reem_Kufi({
  variable: "--font-reem-kufi",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale: AppLocale = isAppLocale(raw) ? raw : "ar";
  const t = await getTranslations({ locale, namespace: "Meta" });
  const isEn = locale === "en";

  return {
    title: {
      default: t("defaultTitle"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    openGraph: {
      title: t("defaultTitle"),
      description: t("ogDescription"),
      url: isEn ? "https://www.arabya.org/en" : "https://www.arabya.org",
      siteName: t("siteName"),
      locale: isEn ? "en_US" : "ar_AR",
      type: "website",
      images: [
        {
          url: "/opengraph-image",
          width: 1200,
          height: 630,
          alt: "Arabya — عربية بذكاء",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: t("defaultTitle"),
      description: t("ogDescription"),
      images: ["/opengraph-image"],
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: raw } = await params;
  if (!isAppLocale(raw)) notFound();
  const locale: AppLocale = raw;
  setRequestLocale(locale);

  const messages = await getMessages();
  const dir = localeDirection(locale);
  const footerCredit = await getFooterCredit(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        {/* Theme boot: key must match STORAGE_KEYS.theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('arabya-theme');var d=t==='dark';document.documentElement.dataset.theme=d?'dark':'light';document.documentElement.style.colorScheme=d?'dark':'light';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#071110':'#0f766e');}catch(e){document.documentElement.dataset.theme='light';document.documentElement.style.colorScheme='light';}})();`,
          }}
        />
      </head>
      <body
        className={`${cairo.variable} ${plexArabic.variable} ${jakarta.variable} ${naskh.variable} ${amiri.variable} ${tajawal.variable} ${reemKufi.variable} antialiased`}
        suppressHydrationWarning
      >
        <NextIntlClientProvider messages={messages}>
          <SyncUiLocaleFromPath />
          <AuthSessionProvider>
            <AppShell footerCredit={footerCredit}>{children}</AppShell>
          </AuthSessionProvider>
        </NextIntlClientProvider>
        <CloudflareAnalytics />
      </body>
    </html>
  );
}
