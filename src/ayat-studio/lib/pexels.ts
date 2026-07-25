// Pexels API client (key stored locally in browser via Settings page).
export const PEXELS_KEY_STORAGE = "ayat_pexels_api_key";

export function getPexelsKey(): string {
  return localStorage.getItem(PEXELS_KEY_STORAGE) || "";
}

export interface PexelsPhoto {
  id: number;
  alt: string;
  photographer: string;
  src: { original: string; large2x: string; large: string; medium: string; portrait: string; landscape: string };
}

export interface PexelsSearchResult {
  total_results: number;
  photos: PexelsPhoto[];
  page: number;
  per_page: number;
}

export async function searchPexelsPhotos(
  query: string,
  opts: { perPage?: number; page?: number; orientation?: "landscape" | "portrait" | "square" } = {}
): Promise<PexelsSearchResult> {
  const key = getPexelsKey();
  if (!key) throw new Error("لم يتم تكوين مفتاح Pexels API. أضِفه من صفحة الإعدادات.");

  const params = new URLSearchParams({
    query,
    per_page: String(opts.perPage ?? 18),
    page: String(opts.page ?? 1),
  });
  if (opts.orientation) params.set("orientation", opts.orientation);

  const res = await fetch(`https://api.pexels.com/v1/search?${params}`, {
    headers: { Authorization: key },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`فشل البحث في Pexels (${res.status}) ${txt.slice(0, 120)}`);
  }
  return res.json();
}

// ===== Videos =====
export interface PexelsVideoFile {
  id: number;
  quality: "hd" | "sd" | "hls" | string;
  file_type: string; // e.g. "video/mp4"
  width: number;
  height: number;
  link: string; // direct mp4 URL
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
  image: string; // poster/thumbnail
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
  opts: { perPage?: number; page?: number; orientation?: "landscape" | "portrait" | "square" } = {}
): Promise<PexelsVideoSearchResult> {
  const key = getPexelsKey();
  if (!key) throw new Error("لم يتم تكوين مفتاح Pexels API. أضِفه من صفحة الإعدادات.");

  const params = new URLSearchParams({
    query,
    per_page: String(opts.perPage ?? 12),
    page: String(opts.page ?? 1),
  });
  if (opts.orientation) params.set("orientation", opts.orientation);

  const res = await fetch(`https://api.pexels.com/videos/search?${params}`, {
    headers: { Authorization: key },
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`فشل البحث في فيديوهات Pexels (${res.status}) ${txt.slice(0, 120)}`);
  }
  return res.json();
}

/** Pick the best mp4 file matching desired orientation, capped at ~1080p to keep export reasonable. */
export function pickBestVideoFile(video: PexelsVideo, orientation: "landscape" | "portrait" | "square"): PexelsVideoFile | null {
  const mp4s = video.video_files.filter((f) => f.file_type === "video/mp4" && f.link);
  if (mp4s.length === 0) return null;
  const wantPortrait = orientation === "portrait";
  const matchOrient = (f: PexelsVideoFile) => (wantPortrait ? f.height >= f.width : f.width >= f.height);
  const candidates = mp4s.filter(matchOrient);
  const pool = candidates.length > 0 ? candidates : mp4s;
  // Prefer files <= 1920 on the long edge; otherwise smallest above
  const sorted = [...pool].sort((a, b) => {
    const longA = Math.max(a.width, a.height);
    const longB = Math.max(b.width, b.height);
    const aOk = longA <= 1920 ? 0 : 1;
    const bOk = longB <= 1920 ? 0 : 1;
    if (aOk !== bOk) return aOk - bOk;
    // among ok, prefer larger; among too-big, prefer smaller
    return aOk === 0 ? longB - longA : longA - longB;
  });
  return sorted[0] || null;
}
