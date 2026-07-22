/** Share helpers — distinct deep links + social destinations. */

export type ListenMode = "surah" | "ayah" | "wbw";

export type ShareKind =
  | "ayah"
  | "page"
  | "surah"
  | "listen-ayah"
  | "listen-surah"
  | "listen-wbw"
  | "note"
  | "irab"
  | "root";

export type SharePayload = {
  title: string;
  text: string;
  url: string;
  kind: ShareKind;
};

export type ShareTarget = {
  id: string;
  kind: ShareKind;
  label: string;
  hint: string;
  payload: SharePayload;
};

export function absoluteUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://www.arabyaai.com";
  return `${base}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** Distinct mushaf share / listen URLs — each kind has a clear `share=` marker. */
export function buildMushafShareUrl(opts: {
  page: number;
  kind: ShareKind;
  verse?: string;
  surahId?: number;
  reciter?: string;
}): string {
  const url = new URL(`/mushaf/${opts.page}`, "https://www.arabyaai.com");
  url.searchParams.set("share", opts.kind);

  if (opts.verse) url.searchParams.set("v", opts.verse);
  if (opts.surahId) url.searchParams.set("sid", String(opts.surahId));

  if (opts.kind === "listen-ayah") {
    url.searchParams.set("listen", "ayah");
  } else if (opts.kind === "listen-surah") {
    url.searchParams.set("listen", "surah");
  } else if (opts.kind === "listen-wbw") {
    url.searchParams.set("listen", "wbw");
  }

  if (
    opts.reciter &&
    (opts.kind === "listen-ayah" ||
      opts.kind === "listen-surah" ||
      opts.kind === "listen-wbw")
  ) {
    url.searchParams.set("reciter", opts.reciter);
  }

  let path = `${url.pathname}${url.search}`;
  if (opts.kind === "ayah" && opts.verse) {
    const [s, a] = opts.verse.split(":");
    if (s && a) path += `#s${s}-v-${a}`;
  }
  return path;
}

/** @deprecated use buildMushafShareUrl — kept for tests/compat */
export function buildListenUrl(opts: {
  path: string;
  listen: ListenMode;
  reciter?: string;
  verse?: string;
}): string {
  const page = Number(opts.path.replace(/^\/mushaf\//, "").split(/[?#]/)[0]);
  const kind =
    opts.listen === "surah"
      ? "listen-surah"
      : opts.listen === "wbw"
        ? "listen-wbw"
        : "listen-ayah";
  return buildMushafShareUrl({
    page: Number.isFinite(page) ? page : 1,
    kind,
    verse: opts.verse,
    reciter: opts.reciter,
  });
}

export function socialShareLinks(payload: SharePayload): {
  id: string;
  label: string;
  href: string;
}[] {
  const fullUrl = absoluteUrl(payload.url);
  const u = encodeURIComponent(fullUrl);
  const body = `${payload.text}\n\n${fullUrl}`;
  const t = encodeURIComponent(payload.text);
  const title = encodeURIComponent(payload.title);
  return [
    {
      id: "whatsapp",
      label: "واتساب",
      href: `https://wa.me/?text=${encodeURIComponent(body)}`,
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
  ];
}

export async function copyLinkOnly(url: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(absoluteUrl(url));
    return true;
  } catch {
    return false;
  }
}

export async function shareOrCopy(
  payload: SharePayload,
): Promise<"shared" | "copied" | "failed"> {
  const full = { ...payload, url: absoluteUrl(payload.url) };
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({
        title: full.title,
        text: full.text,
        url: full.url,
      });
      return "shared";
    }
  } catch {
    /* fall through */
  }
  try {
    await navigator.clipboard.writeText(`${full.text}\n\n${full.url}`);
    return "copied";
  } catch {
    return "failed";
  }
}

/** Dynamic Arabic OG image for a share kind. */
export function shareOgImageUrl(opts: {
  kind: ShareKind;
  page?: number;
  verse?: string;
  surahId?: number;
  root?: string;
}): string {
  const sp = new URLSearchParams();
  sp.set("kind", opts.kind);
  if (opts.page) sp.set("page", String(opts.page));
  if (opts.verse) sp.set("v", opts.verse);
  if (opts.surahId) sp.set("sid", String(opts.surahId));
  if (opts.root) sp.set("root", opts.root);
  return `/api/og?${sp.toString()}`;
}
