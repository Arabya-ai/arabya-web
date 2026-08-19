// Local storage based project store (no auth required)

import {
  STUDIO_PROGRESS_GOLD,
  STUDIO_TAFSIR_TEXT,
  STUDIO_TRANSLATION_TEXT,
} from "@/lib/studio-default-colors";

const PROJECTS_KEY = "ayat_projects";
const EXPORTS_KEY = "ayat_exports";

export type TransitionId =
  | "none"
  | "fade"
  | "slide"
  | "zoom"
  | "blur"
  | "kenburns"
  | "wipe"
  | "rise"
  | "glow";

export type VisualizerId =
  | "none"
  | "bars"
  | "wave"
  | "circle"
  | "particles"
  | "mirror"
  | "aurora"
  | "spectrum"
  | "ripple"
  | "orb"
  | "helix"
  | "lattice"
  | "pulse"
  | "constellation"
  | "comet";

export interface StoredProject {
  id: string;
  title: string;
  reciterId: string;
  surahId: number;
  ayahStart: number;
  ayahEnd: number;
  ratio: string;
  bgType: "none" | "image" | "url";
  bgKind?: "image" | "video";
  bgUrl: string;
  bgPoster?: string;
  bgOpacity?: number;
  translationEnabled: boolean;
  tafsirEnabled: boolean;
  translationSlug?: string;
  tafsirSlug?: string;
  /** Manual edits keyed by `${surahId}:${ayah}` — never for Quran Arabic text. */
  translationOverrides?: Record<string, string>;
  tafsirOverrides?: Record<string, string>;
  /** Ayah (Quran) typography — immutable text source. */
  fontSize: number;
  textColor: string;
  /** Surah name + ayah number meta label above the verse. */
  surahLabelFontSize?: number;
  surahLabelTextColor?: string;
  surahLabelFontFamily?: string;
  translationFontSize?: number;
  translationTextColor?: string;
  tafsirFontSize?: number;
  tafsirTextColor?: string;
  overlayPosition: "top" | "center" | "bottom";
  overlayOpacity: number;
  volume: number;
  fadeIn: boolean;
  fadeOut: boolean;
  playbackRate?: number;
  softNormalize?: boolean;
  pauseBetweenAyahsMs?: number;
  quality: "standard" | "high" | "ultra";
  status: "مسودة" | "مكتمل" | "جاري المعالجة" | "فشل";
  createdAt: string;
  transition?: TransitionId;
  transitionDuration?: number;
  visualizer?: VisualizerId;
  visualizerColor?: string;
  visualizerIntensity?: number;
  /** Preview chrome: ayah text only (hide surah/reciter chrome). */
  previewShowAyahOnly?: boolean;
  previewShowNavBar?: boolean;
  previewShowAyahNumbers?: boolean;
  /** Subtle Arabya signature frame on export/preview for unique composition. */
  brandSignature?: boolean;
  /** Where the Arabya lockup (mark + title) sits in preview/export. */
  brandPosition?:
    | "top-left"
    | "top-center"
    | "top-right"
    | "center-left"
    | "center"
    | "center-right"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
  softVignette?: boolean;
  /** Reciter name placement (or hidden). Default bottom-left to match preview. */
  reciterPosition?:
    | "hidden"
    | "bottom-left"
    | "bottom-center"
    | "bottom-right";
  /** In-frame progress bar — off by default so export matches preview. */
  progressBarStyle?: "none" | "line" | "pill" | "glow" | "dots";
  progressBarColor?: string;
}

export interface StoredExport {
  id: string;
  projectId: string;
  projectTitle: string;
  ratio: string;
  quality: string;
  status: "قيد الانتظار" | "جاري المعالجة" | "مكتمل" | "فشل";
  date: string;
  size: string;
  videoUrl?: string;
}

export function formatProjectDate(
  createdAt: string | undefined,
  locale = "ar-EG",
): string {
  if (!createdAt) return "—";
  const ms = Date.parse(createdAt);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleDateString(locale);
}

function normalizeStoredProject(project: StoredProject): StoredProject {
  const createdAt = project.createdAt?.trim();
  if (createdAt && Number.isFinite(Date.parse(createdAt))) return project;
  return { ...project, createdAt: new Date(0).toISOString() };
}

function persistProjects(projects: StoredProject[]): void {
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function getProjects(): StoredProject[] {
  try {
    const raw = JSON.parse(
      localStorage.getItem(PROJECTS_KEY) || "[]",
    ) as StoredProject[];
    if (!Array.isArray(raw)) return [];
    let changed = false;
    const normalized = raw.map((p) => {
      const next = normalizeStoredProject(p);
      if (next.createdAt !== p.createdAt) changed = true;
      return next;
    });
    if (changed) persistProjects(normalized);
    return normalized;
  } catch {
    return [];
  }
}

export function getProject(id: string): StoredProject | null {
  return getProjects().find((p) => p.id === id) || null;
}

export function saveProject(project: StoredProject): void {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) projects[idx] = project;
  else projects.unshift(project);
  try {
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  } catch (err) {
    const slimOthers = projects.map((p) =>
      p.id !== project.id && p.bgUrl?.startsWith("data:") && p.bgUrl.length > 100_000
        ? { ...p, bgUrl: "", bgPoster: "", bgType: "none" as const, bgKind: "image" as const }
        : p,
    );
    try {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(slimOthers));
      return;
    } catch {
      /* fall through */
    }
    const quotaError = new Error(
      "مساحة التخزين المحلي ممتلئة. احذف مشاريع قديمة أو استخدم خلفية من Pexels بدل رفع ملف كبير.",
    );
    (quotaError as Error & { cause?: unknown }).cause = err;
    throw quotaError;
  }
}

export function deleteProject(id: string): void {
  const projects = getProjects().filter((p) => p.id !== id);
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

export function duplicateProject(id: string): StoredProject | null {
  const p = getProject(id);
  if (!p) return null;
  const copy: StoredProject = {
    ...p,
    id: crypto.randomUUID(),
    title: `${p.title} (نسخة)`,
    createdAt: new Date().toISOString(),
    status: "مسودة",
  };
  saveProject(copy);
  return copy;
}

export function createDefaultProject(input: {
  title: string;
  reciterId: string;
  surahId: number;
  ayahStart: number;
  ayahEnd: number;
  ratio: string;
}): StoredProject {
  const project: StoredProject = {
    id: crypto.randomUUID(),
    title: input.title,
    reciterId: input.reciterId,
    surahId: input.surahId,
    ayahStart: input.ayahStart,
    ayahEnd: input.ayahEnd,
    ratio: input.ratio,
    bgType: "none",
    bgKind: "image",
    bgUrl: "",
    bgPoster: "",
    bgOpacity: 100,
    translationEnabled: false,
    tafsirEnabled: false,
    translationSlug: "saheeh-en",
    tafsirSlug: "muyassar",
    translationOverrides: {},
    tafsirOverrides: {},
    fontSize: 48,
    textColor: "#ffffff",
    surahLabelFontSize: 16,
    surahLabelTextColor: STUDIO_PROGRESS_GOLD,
    surahLabelFontFamily: "IBM Plex Sans Arabic",
    translationFontSize: 22,
    translationTextColor: STUDIO_TRANSLATION_TEXT,
    tafsirFontSize: 18,
    tafsirTextColor: STUDIO_TAFSIR_TEXT,
    overlayPosition: "center",
    overlayOpacity: 40,
    volume: 80,
    fadeIn: true,
    fadeOut: true,
    playbackRate: 1,
    softNormalize: true,
    pauseBetweenAyahsMs: 0,
    quality: "high",
    status: "مسودة",
    createdAt: new Date().toISOString(),
    transition: "fade",
    transitionDuration: 0.6,
    visualizer: "bars",
    visualizerColor: STUDIO_PROGRESS_GOLD,
    visualizerIntensity: 60,
    previewShowAyahOnly: false,
    previewShowNavBar: true,
    previewShowAyahNumbers: true,
    brandSignature: true,
    brandPosition: "bottom-left",
    softVignette: true,
    reciterPosition: "bottom-right",
    progressBarStyle: "none",
    progressBarColor: STUDIO_PROGRESS_GOLD,
  };
  saveProject(project);
  return project;
}

export function getExports(): StoredExport[] {
  try {
    return JSON.parse(localStorage.getItem(EXPORTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveExport(exp: StoredExport): void {
  const list = getExports();
  const idx = list.findIndex((e) => e.id === exp.id);
  if (idx >= 0) list[idx] = exp;
  else list.unshift(exp);
  localStorage.setItem(
    EXPORTS_KEY,
    JSON.stringify(list.map(({ videoUrl, ...rest }) => rest)),
  );
  if (exp.videoUrl) sessionVideoUrls.set(exp.id, exp.videoUrl);
}

export function deleteExport(id: string): void {
  const list = getExports().filter((e) => e.id !== id);
  localStorage.setItem(EXPORTS_KEY, JSON.stringify(list));
  sessionVideoUrls.delete(id);
}

const sessionVideoUrls = new Map<string, string>();
export function getExportVideoUrl(id: string): string | undefined {
  return sessionVideoUrls.get(id);
}
