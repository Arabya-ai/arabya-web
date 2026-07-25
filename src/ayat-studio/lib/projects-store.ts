// Local storage based project store (no auth required)

const PROJECTS_KEY = "ayat_projects";
const EXPORTS_KEY = "ayat_exports";

export interface StoredProject {
  id: string;
  title: string;
  reciterId: string;
  surahId: number;
  ayahStart: number;
  ayahEnd: number;
  ratio: string;
  bgType: "none" | "image" | "url";
  /** Whether the bgUrl points to an image (default) or a video file (mp4). */
  bgKind?: "image" | "video";
  bgUrl: string;
  bgOpacity?: number; // 0..100 — opacity of background media itself
  translationEnabled: boolean;
  tafsirEnabled: boolean;
  fontSize: number;
  textColor: string;
  overlayPosition: "top" | "center" | "bottom";
  overlayOpacity: number;
  volume: number;
  fadeIn: boolean;
  fadeOut: boolean;
  quality: "standard" | "high" | "ultra";
  status: "مسودة" | "مكتمل" | "جاري المعالجة" | "فشل";
  createdAt: string;
  // New: visual transitions between ayahs
  transition?: "none" | "fade" | "slide" | "zoom" | "blur" | "kenburns";
  transitionDuration?: number; // seconds
  // New: audio reactive visualizer
  visualizer?: "none" | "bars" | "wave" | "circle" | "particles";
  visualizerColor?: string;
  visualizerIntensity?: number; // 0..100
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
  videoUrl?: string; // object URL for downloading
}

export function getProjects(): StoredProject[] {
  try {
    return JSON.parse(localStorage.getItem(PROJECTS_KEY) || "[]");
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
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
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
    bgOpacity: 100,
    translationEnabled: true,
    tafsirEnabled: false,
    fontSize: 48,
    textColor: "#ffffff",
    overlayPosition: "center",
    overlayOpacity: 40,
    volume: 80,
    fadeIn: true,
    fadeOut: true,
    quality: "high",
    status: "مسودة",
    createdAt: new Date().toISOString(),
    transition: "fade",
    transitionDuration: 0.6,
    visualizer: "bars",
    visualizerColor: "#C8A951",
    visualizerIntensity: 60,
  };
  saveProject(project);
  return project;
}

// Exports
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
  // Persist metadata only (object URLs cannot be persisted across reloads)
  // We still save them in current session memory map separately
  localStorage.setItem(
    EXPORTS_KEY,
    JSON.stringify(list.map(({ videoUrl, ...rest }) => rest))
  );
  // Keep videoUrl in session map
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
