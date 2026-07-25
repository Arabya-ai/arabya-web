import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.arabyaai.com"),
  title: {
    default: "عربية | تفسير كلمات القرآن الكريم",
    template: "%s | عربية",
  },
  description:
    "فهرس سور القرآن مع دراسة كل كلمة: معنى، إعراب، وتفاسير متعددة — عربية",
  openGraph: {
    title: "عربية | تفسير كلمات القرآن الكريم",
    description: "ادرس كل كلمة في القرآن مع إعراب وتفاسير قابلة للتبديل",
    url: "https://www.arabyaai.com",
    siteName: "عربية",
    locale: "ar_AR",
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
    title: "عربية | تفسير كلمات القرآن الكريم",
    description: "ادرس كل كلمة في القرآن مع إعراب وتفاسير قابلة للتبديل",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/brand/favicon-32.png", type: "image/png", sizes: "32x32" },
      { url: "/brand/arabya-mark-square.png", type: "image/png", sizes: "512x512" },
    ],
    apple: [
      {
        url: "/brand/apple-touch-icon.png",
        type: "image/png",
        sizes: "180x180",
      },
    ],
    shortcut: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#0f766e",
};

/** Pass-through root — `html`/`body` live in `[locale]/layout`. */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
