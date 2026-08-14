// Pexels via Arabya `/api/studio/pexels` (avoids browser CORS / key exposure issues).
export const PEXELS_KEY_STORAGE = "ayat_pexels_api_key";

export function getPexelsKey(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(PEXELS_KEY_STORAGE) || "";
}

export interface PexelsPhoto {
  id: number;
  alt: string;
  photographer: string;
  src: {
    original: string;
    large2x: string;
    large: string;
    medium: string;
    portrait: string;
    landscape: string;
  };
}

export interface PexelsSearchResult {
  total_results: number;
  photos: PexelsPhoto[];
  page: number;
  per_page: number;
}

async function pexelsFetch(kind: "photos" | "videos", query: string, opts: {
  perPage?: number;
  page?: number;
  orientation?: "landscape" | "portrait" | "square";
}) {
  const params = new URLSearchParams({
    type: kind,
    query,
    per_page: String(opts.perPage ?? (kind === "videos" ? 12 : 18)),
    page: String(opts.page ?? 1),
  });
  if (opts.orientation) params.set("orientation", opts.orientation);

  let res: Response;
  try {
    res = await fetch(`/api/studio/pexels?${params}`, {
      credentials: "same-origin",
    });
  } catch {
    throw new Error("تعذّر الاتصال بخادم البحث. حدّث الصفحة وحاول مجددًا.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err.error === "missing_pexels_key") {
      throw new Error(
        "مفتاح Pexels غير مضبوط على السيرفر. اطلب من المدير تعيين PEXELS_API_KEY.",
      );
    }
    if (err.error === "auth_required") {
      throw new Error("يلزم تسجيل الدخول للبحث في الخلفيات.");
    }
    throw new Error(
      `فشل البحث في Pexels (${res.status})${err.detail ? `: ${String(err.detail).slice(0, 80)}` : ""}`,
    );
  }
  return res.json();
}

export async function searchPexelsPhotos(
  query: string,
  opts: {
    perPage?: number;
    page?: number;
    orientation?: "landscape" | "portrait" | "square";
  } = {},
): Promise<PexelsSearchResult> {
  return pexelsFetch("photos", query, opts);
}

export interface PexelsVideoFile {
  id: number;
  quality: "hd" | "sd" | "hls" | string;
  file_type: string;
  width: number;
  height: number;
  link: string;
}

export interface PexelsVideoPicture {
  id: number;
  picture: string;
  nr: number;
}

export interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  image: string;
  user: { name: string; url: string };
  video_files: PexelsVideoFile[];
  video_pictures: PexelsVideoPicture[];
}

export interface PexelsVideoSearchResult {
  total_results: number;
  videos: PexelsVideo[];
  page: number;
  per_page: number;
}

export async function searchPexelsVideos(
  query: string,
  opts: {
    perPage?: number;
    page?: number;
    orientation?: "landscape" | "portrait" | "square";
  } = {},
): Promise<PexelsVideoSearchResult> {
  return pexelsFetch("videos", query, opts);
}

export function pickBestVideoFile(
  video: PexelsVideo,
  orientation: "landscape" | "portrait" | "square",
): PexelsVideoFile | null {
  const files = Array.isArray(video.video_files) ? video.video_files : [];
  const isMp4 = (f: PexelsVideoFile) => {
    const type = (f.file_type || "").toLowerCase();
    const link = (f.link || "").toLowerCase();
    if (!f.link) return false;
    if (type.includes("hls") || link.includes(".m3u8")) return false;
    if (type.includes("mp4")) return true;
    if (link.includes(".mp4")) return true;
    // Pexels Vimeo external links often omit file_type but are progressive mp4.
    if (link.includes("player.vimeo.com/external/")) return true;
    if (link.includes("videos.pexels.com/video-files/")) return true;
    return false;
  };

  const mp4s = files.filter(isMp4);
  if (mp4s.length === 0) return null;

  const wantPortrait = orientation === "portrait";
  const matchOrient = (f: PexelsVideoFile) => {
    if (!f.width || !f.height) return true;
    return wantPortrait ? f.height >= f.width : f.width >= f.height;
  };
  const candidates = mp4s.filter(matchOrient);
  const pool = candidates.length > 0 ? candidates : mp4s;

  const sorted = [...pool].sort((a, b) => {
    const longA = Math.max(a.width || 0, a.height || 0) || 9999;
    const longB = Math.max(b.width || 0, b.height || 0) || 9999;
    // Prefer mid quality (≤1080) for reliable proxy + encode; then largest under cap.
    const score = (long: number) => {
      if (long <= 0) return 5000;
      if (long <= 1080) return 1000 - long; // prefer closer to 1080
      if (long <= 1920) return 2000 + long;
      return 3000 + long;
    };
    return score(longA) - score(longB);
  });
  return sorted[0] || null;
}
