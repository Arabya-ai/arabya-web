/** Share helpers — direct links + social share URLs (no third-party SDKs). */

export type ListenMode = "surah" | "ayah" | "wbw";

export type SharePayload = {
  title: string;
  text: string;
  url: string;
};

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.arabyaai.com";
  return `${base}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

export function buildListenUrl(opts: {
  path: string;
  listen: ListenMode;
  reciter?: string;
  verse?: string;
}): string {
  const url = new URL(opts.path, "https://www.arabyaai.com");
  url.searchParams.set("listen", opts.listen);
  if (opts.reciter) url.searchParams.set("reciter", opts.reciter);
  if (opts.verse) url.searchParams.set("v", opts.verse);
  return `${url.pathname}${url.search}`;
}

export function socialShareLinks(payload: SharePayload): {
  id: string;
  label: string;
  href: string;
}[] {
  const u = encodeURIComponent(payload.url);
  const t = encodeURIComponent(payload.text);
  const title = encodeURIComponent(payload.title);
  return [
    {
      id: "whatsapp",
      label: "واتساب",
      href: `https://wa.me/?text=${encodeURIComponent(`${payload.text}\n${payload.url}`)}`,
    },
    {
      id: "telegram",
      label: "تيليجرام",
      href: `https://t.me/share/url?url=${u}&text=${t}`,
    },
    {
      id: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${u}&text=${title}`,
    },
    {
      id: "facebook",
      label: "فيسبوك",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    },
    {
      id: "linkedin",
      label: "لينكدإن",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    },
  ];
}

export async function shareOrCopy(payload: SharePayload): Promise<"shared" | "copied" | "failed"> {
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return "shared";
    }
  } catch {
    /* fall through to clipboard */
  }
  try {
    await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
    return "copied";
  } catch {
    return "failed";
  }
}
