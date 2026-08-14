// Pixabay via Arabya `/api/studio/pixabay` (avoids browser CORS / key exposure).
export const PIXABAY_KEY_STORAGE = "ayat_pixabay_api_key";

export function getPixabayKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PIXABAY_KEY_STORAGE) || "";
}

/** Normalized hit for studio UI (parallel to Pexels shapes). */
export interface PixabayPhoto {
  id: number;
  alt: string;
  photographer: string;
  src: {
    original: string;
    large: string;
    medium: string;
    portrait: string;
    landscape: string;
  };
}

export interface PixabaySearchResult {
  total_results: number;
  photos: PixabayPhoto[];
  page: number;
  per_page: number;
}

export interface PixabayVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

export interface PixabayVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  user: { name: string; url: string };
  video_files: PixabayVideoFile[];
}

export interface PixabayVideoSearchResult {
  total_results: number;
  videos: PixabayVideo[];
  page: number;
  per_page: number;
}

interface PixabayImageHit {
  id: number;
  pageURL?: string;
  tags?: string;
  previewURL?: string;
  webformatURL?: string;
  largeImageURL?: string;
  fullHDURL?: string;
  imageURL?: string;
  user?: string;
  user_id?: number;
  imageWidth?: number;
  imageHeight?: number;
}

interface PixabayVideoSize {
  url?: string;
  width?: number;
  height?: number;
  size?: number;
  thumbnail?: string;
}

interface PixabayVideoHit {
  id: number;
  pageURL?: string;
  tags?: string;
  duration?: number;
  picture_id?: string;
  user?: string;
  user_id?: number;
  videos?: {
    large?: PixabayVideoSize;
    medium?: PixabayVideoSize;
    small?: PixabayVideoSize;
    tiny?: PixabayVideoSize;
  };
}

function videoPoster(hit: PixabayVideoHit): string {
  const sizes = hit.videos;
  const fromSize =
    sizes?.medium?.thumbnail ||
    sizes?.large?.thumbnail ||
    sizes?.small?.thumbnail ||
    sizes?.tiny?.thumbnail ||
    "";
  if (fromSize) return fromSize;
  if (hit.picture_id) {
    return `https://i.vimeocdn.com/video/${hit.picture_id}_640x360.jpg`;
  }
  return "";
}

function normalizePhotos(
  hits: PixabayImageHit[],
  page: number,
  perPage: number,
  total: number,
): PixabaySearchResult {
  const photos: PixabayPhoto[] = hits.map((h) => {
    const large = h.largeImageURL || h.fullHDURL || h.webformatURL || "";
    const medium = h.webformatURL || h.previewURL || large;
    const original = h.imageURL || h.fullHDURL || large;
    return {
      id: h.id,
      alt: h.tags || "",
      photographer: h.user || "Pixabay",
      src: {
        original,
        large,
        medium,
        portrait: large || medium,
        landscape: large || medium,
      },
    };
  });
  return {
    total_results: total,
    photos,
    page,
    per_page: perPage,
  };
}

function normalizeVideos(
  hits: PixabayVideoHit[],
  page: number,
  perPage: number,
  total: number,
): PixabayVideoSearchResult {
  const videos: PixabayVideo[] = hits.map((h) => {
    const sizes = h.videos || {};
    const files: PixabayVideoFile[] = [];
    let i = 0;
    for (const [quality, size] of Object.entries(sizes) as Array<
      [string, PixabayVideoSize | undefined]
    >) {
      if (!size?.url) continue;
      files.push({
        id: i++,
        quality,
        file_type: "video/mp4",
        width: size.width || 0,
        height: size.height || 0,
        link: size.url,
      });
    }
    const primary = sizes.medium || sizes.large || sizes.small || sizes.tiny;
    return {
      id: h.id,
      width: primary?.width || 0,
      height: primary?.height || 0,
      duration: h.duration || 0,
      url: h.pageURL || "",
      image: videoPoster(h),
      user: { name: h.user || "Pixabay", url: "" },
      video_files: files,
    };
  });
  return {
    total_results: total,
    videos,
    page,
    per_page: perPage,
  };
}

async function pixabayFetch(
  kind: "photos" | "videos",
  query: string,
  opts: {
    perPage?: number;
    page?: number;
    orientation?: "landscape" | "portrait" | "square";
  },
) {
  const params = new URLSearchParams({
    type: kind,
    query,
    per_page: String(opts.perPage ?? (kind === "videos" ? 12 : 18)),
    page: String(opts.page ?? 1),
  });
  if (opts.orientation) params.set("orientation", opts.orientation);

  let res: Response;
  try {
    res = await fetch(`/api/studio/pixabay?${params}`, {
      credentials: "same-origin",
    });
  } catch {
    throw new Error("تعذّر الاتصال بخادم البحث. حدّث الصفحة وحاول مجددًا.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err.error === "missing_pixabay_key") {
      throw new Error(
        "مفتاح Pixabay غير مضبوط على السيرفر. اطلب من المدير تعيين PIXABAY_API_KEY.",
      );
    }
    if (err.error === "auth_required") {
      throw new Error("يلزم تسجيل الدخول للبحث في الخلفيات.");
    }
    throw new Error(`فشل البحث في Pixabay (${res.status})`);
  }

  const data = await res.json();
  const hits = Array.isArray(data.hits) ? data.hits : [];
  const total = typeof data.totalHits === "number" ? data.totalHits : hits.length;
  const page = opts.page ?? 1;
  const perPage = opts.perPage ?? (kind === "videos" ? 12 : 18);

  if (kind === "videos") {
    return normalizeVideos(hits, page, perPage, total);
  }
  return normalizePhotos(hits, page, perPage, total);
}

export async function searchPixabayPhotos(
  query: string,
  opts: {
    perPage?: number;
    page?: number;
    orientation?: "landscape" | "portrait" | "square";
  } = {},
): Promise<PixabaySearchResult> {
  return pixabayFetch("photos", query, opts) as Promise<PixabaySearchResult>;
}

export async function searchPixabayVideos(
  query: string,
  opts: {
    perPage?: number;
    page?: number;
    orientation?: "landscape" | "portrait" | "square";
  } = {},
): Promise<PixabayVideoSearchResult> {
  return pixabayFetch("videos", query, opts) as Promise<PixabayVideoSearchResult>;
}

export function pickBestPixabayVideoFile(
  video: PixabayVideo,
  orientation: "landscape" | "portrait" | "square",
): PixabayVideoFile | null {
  const files = Array.isArray(video.video_files) ? video.video_files : [];
  const mp4s = files.filter((f) => {
    const link = (f.link || "").toLowerCase();
    if (!f.link) return false;
    if (link.includes(".m3u8")) return false;
    if (link.includes(".mp4")) return true;
    if ((f.file_type || "").toLowerCase().includes("mp4")) return true;
    // Pixabay size URLs are usually progressive mp4 without extension quirks.
    if (link.includes("cdn.pixabay.com")) return true;
    return false;
  });
  if (mp4s.length === 0) return null;

  const wantPortrait = orientation === "portrait";
  const matchOrient = (f: PixabayVideoFile) => {
    if (!f.width || !f.height) return true;
    return wantPortrait ? f.height >= f.width : f.width >= f.height;
  };
  const candidates = mp4s.filter(matchOrient);
  const pool = candidates.length > 0 ? candidates : mp4s;

  const sorted = [...pool].sort((a, b) => {
    // Use the shorter side as the "resolution class" (1080×1920 → 1080).
    const shortA = Math.min(a.width || 0, a.height || 0) || 9999;
    const shortB = Math.min(b.width || 0, b.height || 0) || 9999;
    const score = (short: number) => {
      if (short <= 0) return 5000;
      if (short <= 1080) return 1000 - short; // prefer closer to 1080
      if (short <= 1440) return 2000 + short;
      return 3000 + short;
    };
    return score(shortA) - score(shortB);
  });
  return sorted[0] || null;
}
