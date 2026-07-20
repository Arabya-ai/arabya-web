import type { Metadata } from "next";
import { Amiri, IBM_Plex_Sans_Arabic } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import "./globals.css";

const amiri = Amiri({
  variable: "--font-amiri",
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
});

const ibmArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://arabyaai.com"),
  title: {
    default: "Arabya.ai | تفسير كلمات القرآن الكريم",
    template: "%s | Arabya.ai",
  },
  description:
    "فهرس سور القرآن الكريم مع تفسير معاني الكلمات آيةً آية — Arabya.ai",
  openGraph: {
    title: "Arabya.ai | تفسير كلمات القرآن الكريم",
    description: "فهرس سور القرآن الكريم مع تفسير معاني الكلمات",
    url: "https://arabyaai.com",
    siteName: "Arabya.ai",
    locale: "ar_AR",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className={`${amiri.variable} ${ibmArabic.variable} antialiased`}>
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
