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
  const key = getPexelsKey();
  const params = new URLSearchParams({
    type: kind,
    query,
    per_page: String(opts.perPage ?? (kind === "videos" ? 12 : 18)),
    page: String(opts.page ?? 1),
  });
  if (opts.orientation) params.set("orientation", opts.orientation);

  const headers: HeadersInit = {};
  if (key) headers["X-Pexels-Key"] = key;

  let res: Response;
  try {
    res = await fetch(`/api/studio/pexels?${params}`, {
      credentials: "same-origin",
      headers,
    });
  } catch {
    throw new Error("تعذّر الاتصال بخادم البحث. حدّث الصفحة وحاول مجددًا.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    if (err.error === "missing_pexels_key") {
      throw new Error(
        "لم يتم تكوين مفتاح Pexels. أضِفه من الإعدادات، أو اطلب من المالك ضبط PEXELS_API_KEY على السيرفر.",
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
  const mp4s = video.video_files.filter((f) => f.file_type === "video/mp4" && f.link);
  if (mp4s.length === 0) return null;
  const wantPortrait = orientation === "portrait";
  const matchOrient = (f: PexelsVideoFile) =>
    wantPortrait ? f.height >= f.width : f.width >= f.height;
  const candidates = mp4s.filter(matchOrient);
  const pool = candidates.length > 0 ? candidates : mp4s;
  const sorted = [...pool].sort((a, b) => {
    const longA = Math.max(a.width, a.height);
    const longB = Math.max(b.width, b.height);
    const aOk = longA <= 1920 ? 0 : 1;
    const bOk = longB <= 1920 ? 0 : 1;
    if (aOk !== bOk) return aOk - bOk;
    return aOk === 0 ? longB - longA : longA - longB;
  });
  return sorted[0] || null;
}
