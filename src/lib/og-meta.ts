/** Shared Open Graph / Twitter card metadata helpers. */

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export const DEFAULT_OG_IMAGE = {
  url: "/opengraph-image",
  width: OG_IMAGE_SIZE.width,
  height: OG_IMAGE_SIZE.height,
  alt: "Arabya — عربية بذكاء",
} as const;

export function mushafOgImagePath(page: number): string {
  return `/mushaf/${page}/opengraph-image`;
}

export function ayahOgImagePath(surahId: number, verse: number): string {
  return `/ayah/${surahId}/${verse}/opengraph-image`;
}

export function rootOgImagePath(root: string): string {
  return `/root/${encodeURIComponent(root)}/opengraph-image`;
}

export function buildSocialMetadata(opts: {
  title: string;
  description: string;
  url: string;
  imageUrl: string;
  imageAlt?: string;
}) {
  const image = {
    url: opts.imageUrl,
    width: OG_IMAGE_SIZE.width,
    height: OG_IMAGE_SIZE.height,
    alt: opts.imageAlt ?? opts.title,
  };
  return {
    openGraph: {
      title: opts.title,
      description: opts.description,
      url: opts.url,
      siteName: "عربية",
      locale: "ar_AR",
      type: "article" as const,
      images: [image],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: opts.title,
      description: opts.description,
      images: [opts.imageUrl],
    },
  };
}
