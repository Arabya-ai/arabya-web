import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Amiri, Cairo, Noto_Naskh_Arabic } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import "./globals.css";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const naskh = Noto_Naskh_Arabic({
  variable: "--font-naskh",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.arabyaai.com"),
  title: {
    default: "Arabya | تفسير كلمات القرآن الكريم",
    template: "%s | Arabya",
  },
  description:
    "فهرس سور القرآن مع دراسة كل كلمة: معنى، إعراب، وتفاسير متعددة — Arabya",
  openGraph: {
    title: "Arabya | تفسير كلمات القرآن الكريم",
    description: "ادرس كل كلمة في القرآن مع إعراب وتفاسير قابلة للتبديل",
    url: "https://www.arabyaai.com",
    siteName: "Arabya",
    locale: "ar_AR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0f766e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('arabya-theme');var d=t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content',d?'#071110':'#0f766e');}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${cairo.variable} ${naskh.variable} ${amiri.variable} antialiased`}>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
