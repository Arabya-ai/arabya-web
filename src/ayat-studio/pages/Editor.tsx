"use client";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { studioPath } from "@/ayat-studio/lib/studio-paths";
import { Button } from "@/ayat-studio/components/ui/button";
import { Input } from "@/ayat-studio/components/ui/input";
import { Label } from "@/ayat-studio/components/ui/label";
import { Textarea } from "@/ayat-studio/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/ayat-studio/components/ui/select";
import { Slider } from "@/ayat-studio/components/ui/slider";
import { Switch } from "@/ayat-studio/components/ui/switch";
import {
  reciters,
  surahs,
  aspectRatios,
  transitions,
  visualizers,
  previewAspectClass,
} from "@/ayat-studio/lib/quran-data";
import {
  BookOpen,
  Image as ImageIcon,
  Languages,
  Type,
  Music,
  Download,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  Sparkles,
  AudioLines,
  MapPin,
} from "lucide-react";
import {
  getProject,
  saveProject,
  type StoredProject,
} from "@/ayat-studio/lib/projects-store";
import {
  exportProjectToVideo,
  exportProjectToPng,
  downloadBlob,
} from "@/ayat-studio/lib/video-export";
import { saveExport } from "@/ayat-studio/lib/projects-store";
import { useToast } from "@/ayat-studio/hooks/use-toast";
import { BackgroundPicker } from "@/ayat-studio/components/BackgroundPicker";
import { AudioPreviewPlayer } from "@/ayat-studio/components/AudioPreviewPlayer";
import { ColorPickerField } from "@/ayat-studio/components/ColorPickerField";
import { useSession } from "next-auth/react";
import {
  canExportStudioMp4,
  studioExportNeedsWatermark,
  canExportUnlimitedStudioAyahs,
  STUDIO_MAX_AYAHS,
} from "@/lib/plans";
import {
  canExportStudioWithoutBrand,
  type UserRole,
} from "@/lib/roles";
import {
  BRAND_POSITION_LABELS_AR,
  BRAND_POSITION_PAD,
  brandPositionClass,
  normalizeBrandPosition,
  type BrandPosition,
} from "@/ayat-studio/lib/brand-position";
import { Link } from "@/i18n/navigation";
import { useStudioPreviewSrc } from "@/ayat-studio/hooks/use-studio-preview-src";
import { ArabyaMarkIcon } from "@/ayat-studio/components/IslamicDecor";
import { fetchAyahs, type AyahData } from "@/ayat-studio/lib/quran-api";
import { clampAyahPreviewIndex } from "@/ayat-studio/lib/studio-preview";
import {
  fetchStudioEditions,
  fetchTranslationMap,
  fetchTafsirMap,
  layerKey,
  resolveLayerText,
  type StudioEdition,
} from "@/ayat-studio/lib/studio-layers";

function EditorPanel({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-accent/10 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
            <Icon className="h-3.5 w-3.5 text-accent" />
          </div>
          <span className="font-display">{title}</span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-accent/60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in">{children}</div>
      )}
    </div>
  );
}

function previewTransitionStyle(
  transition: string | undefined,
  durationSec: number,
): React.CSSProperties {
  const sec = Math.max(0.2, durationSec);
  const d = `${sec}s`;
  switch (transition) {
    case "slide":
      return { animation: `studio-slide ${d} ease` };
    case "zoom":
      return { animation: `studio-zoom ${d} ease` };
    case "blur":
      return { animation: `studio-blur ${d} ease` };
    case "wipe":
      return { animation: `studio-wipe ${d} ease` };
    case "rise":
      return { animation: `studio-rise ${d} ease` };
    case "glow":
      return { animation: `studio-glow ${d} ease` };
    case "kenburns":
      return { animation: `studio-kenburns ${Math.max(sec, 4)}s linear` };
    case "none":
      return {};
    default:
      return { animation: `studio-fade ${d} ease` };
  }
}

export default function Editor() {
  const params = useParams();
  const id = (params?.id as string) || "";
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const plan = session?.user?.plan ?? "free";
  const role = (session?.user?.role as UserRole | undefined) ?? "member";
  const canExportMp4 = canExportStudioMp4(plan);
  const canOmitBrand = canExportStudioWithoutBrand(
    role,
    session?.user?.email,
  );
  const needsWatermark = studioExportNeedsWatermark({
    plan,
    role,
    email: session?.user?.email,
  });
  const unlimitedAyahs = canExportUnlimitedStudioAyahs(session?.user?.email);
  const maxAyahSpan = unlimitedAyahs ? 9999 : STUDIO_MAX_AYAHS;

  const [project, setProject] = useState<StoredProject | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [previewAyahs, setPreviewAyahs] = useState<AyahData[]>([]);
  const [previewAyahIndex, setPreviewAyahIndex] = useState(0);
  const [ayahsLoading, setAyahsLoading] = useState(false);
  const [ayahsError, setAyahsError] = useState<string | null>(null);
  const [translationEditions, setTranslationEditions] = useState<StudioEdition[]>([]);
  const [tafsirEditions, setTafsirEditions] = useState<StudioEdition[]>([]);
  const [translationMap, setTranslationMap] = useState<Record<number, string> | null>(null);
  const [tafsirMap, setTafsirMap] = useState<Record<number, string> | null>(null);
  const [layersLoading, setLayersLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    const p = getProject(id);
    if (!p) {
      toast({ title: "المشروع غير موجود", variant: "destructive" });
      router.push(studioPath("/projects"));
      return;
    }
    setProject({
      ...p,
      bgKind: p.bgKind === "video" ? "video" : "image",
      bgPoster: p.bgPoster || "",
      bgOpacity: p.bgOpacity ?? 100,
      previewShowNavBar: p.previewShowNavBar ?? true,
      previewShowAyahNumbers: p.previewShowAyahNumbers ?? true,
      previewShowAyahOnly: p.previewShowAyahOnly ?? false,
      brandSignature: p.brandSignature ?? true,
      brandPosition: normalizeBrandPosition(p.brandPosition),
      softVignette: p.softVignette ?? true,
      translationSlug: p.translationSlug || "saheeh-en",
      tafsirSlug: p.tafsirSlug || "muyassar",
      translationFontSize: p.translationFontSize ?? 22,
      translationTextColor: p.translationTextColor || "#f0e6d0",
      tafsirFontSize: p.tafsirFontSize ?? 18,
      tafsirTextColor: p.tafsirTextColor || "#d4c4a8",
      playbackRate: p.playbackRate ?? 1,
      softNormalize: p.softNormalize ?? true,
      pauseBetweenAyahsMs: p.pauseBetweenAyahsMs ?? 0,
    });
    // Only re-load when the project id changes — not when toast identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const eds = await fetchStudioEditions();
        if (cancelled) return;
        setTranslationEditions(eds.translations);
        setTafsirEditions(eds.tafsirs);
      } catch {
        /* optional catalog */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    const load = async () => {
      setAyahsLoading(true);
      setAyahsError(null);
      try {
        const ayahs = await fetchAyahs(
          project.surahId,
          project.ayahStart,
          project.ayahEnd,
          project.reciterId,
        );
        if (cancelled) return;
        setPreviewAyahs(ayahs);
        setPreviewAyahIndex(0);
      } catch (e: unknown) {
        if (cancelled) return;
        setPreviewAyahs([]);
        setAyahsError(e instanceof Error ? e.message : "فشل جلب الآيات");
      } finally {
        if (!cancelled) setAyahsLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [project?.surahId, project?.ayahStart, project?.ayahEnd, project?.reciterId]);

  useEffect(() => {
    if (!project) return;
    let cancelled = false;
    const load = async () => {
      if (!project.translationEnabled && !project.tafsirEnabled) {
        setTranslationMap(null);
        setTafsirMap(null);
        return;
      }
      setLayersLoading(true);
      try {
        const [tr, tf] = await Promise.all([
          project.translationEnabled && project.translationSlug
            ? fetchTranslationMap(project.translationSlug, project.surahId)
            : Promise.resolve(null),
          project.tafsirEnabled && project.tafsirSlug
            ? fetchTafsirMap(project.tafsirSlug, project.surahId)
            : Promise.resolve(null),
        ]);
        if (cancelled) return;
        setTranslationMap(tr);
        setTafsirMap(tf);
      } catch (e: unknown) {
        if (!cancelled) {
          toast({
            title: "تعذّر تحميل الترجمة/التفسير",
            description: e instanceof Error ? e.message : "حاول مرة أخرى",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLayersLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    project?.surahId,
    project?.translationEnabled,
    project?.tafsirEnabled,
    project?.translationSlug,
    project?.tafsirSlug,
    toast,
  ]);

  const currentPreviewAyah =
    project && previewAyahs.length
      ? previewAyahs[
          clampAyahPreviewIndex(previewAyahIndex, previewAyahs.length)
        ] || null
      : null;

  const translationText = useMemo(() => {
    if (!project?.translationEnabled || !currentPreviewAyah) return "";
    return resolveLayerText(
      translationMap,
      project.translationOverrides,
      project.surahId,
      currentPreviewAyah.numberInSurah,
    );
  }, [
    project?.translationEnabled,
    project?.translationOverrides,
    project?.surahId,
    translationMap,
    currentPreviewAyah,
  ]);

  const tafsirText = useMemo(() => {
    if (!project?.tafsirEnabled || !currentPreviewAyah) return "";
    return resolveLayerText(
      tafsirMap,
      project.tafsirOverrides,
      project.surahId,
      currentPreviewAyah.numberInSurah,
    );
  }, [
    project?.tafsirEnabled,
    project?.tafsirOverrides,
    project?.surahId,
    tafsirMap,
    currentPreviewAyah,
  ]);

  const previewBgKind = project?.bgKind === "video" ? "video" : "image";
  const previewMedia = useStudioPreviewSrc(
    project?.bgUrl,
    project?.bgPoster,
    previewBgKind,
  );

  if (!project) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        جاري التحميل...
      </div>
    );
  }

  const update = (patch: Partial<StoredProject>) => {
    const next = { ...project, ...patch };
    setProject(next);
    try {
      saveProject(next);
    } catch (err) {
      console.warn("saveProject failed", err);
      toast({
        title: "تعذّر حفظ المشروع محليًا",
        description:
          err instanceof Error
            ? err.message
            : "قد تكون مساحة التخزين ممتلئة. احذف مشاريع قديمة أو استخدم خلفية Pexels.",
        variant: "destructive",
      });
    }
  };

  const clampSpan = (start: number, end: number) => {
    let s = Math.max(1, start);
    let e = Math.max(s, end);
    if (e - s + 1 > maxAyahSpan) e = s + maxAyahSpan - 1;
    return { start: s, end: e };
  };

  const selectedSurah = surahs.find((s) => s.id === project.surahId);
  const selectedReciter = reciters.find((r) => r.id === project.reciterId);
  const previewAspect = previewAspectClass(project.ratio);
  const previewRatioMeta =
    aspectRatios.find((r) => r.id === project.ratio) ?? aspectRatios[0];
  const previewAr = previewRatioMeta.width / previewRatioMeta.height;
  const ayahNum = currentPreviewAyah?.numberInSurah ?? project.ayahStart;

  const setOverride = (
    kind: "translation" | "tafsir",
    text: string,
  ) => {
    if (!currentPreviewAyah) return;
    const key = layerKey(project.surahId, currentPreviewAyah.numberInSurah);
    if (kind === "translation") {
      update({
        translationOverrides: {
          ...(project.translationOverrides || {}),
          [key]: text,
        },
      });
    } else {
      update({
        tafsirOverrides: {
          ...(project.tafsirOverrides || {}),
          [key]: text,
        },
      });
    }
  };

  const handleManualSave = () => {
    try {
      saveProject(project);
      toast({
        title: "تم الحفظ",
        description: "حُفظت إعدادات المشروع على هذا الجهاز.",
      });
    } catch (err) {
      toast({
        title: "تعذّر الحفظ",
        description:
          err instanceof Error
            ? err.message
            : "قد تكون مساحة التخزين ممتلئة.",
        variant: "destructive",
      });
    }
  };

  const handleExport = async () => {
    if (!canExportMp4) {
      toast({
        title: "يلزم تسجيل الدخول",
        description: "سجّل الدخول لتصدير الفيديو.",
        variant: "destructive",
      });
      return;
    }
    const span = Math.max(1, project.ayahEnd - project.ayahStart + 1);
    if (!unlimitedAyahs && span > STUDIO_MAX_AYAHS) {
      toast({
        title: "نطاق الآيات طويل",
        description: `الحد الأقصى ${STUDIO_MAX_AYAHS} آية لكل تصدير فيديو.`,
        variant: "destructive",
      });
      return;
    }
    setExporting(true);
    setProgress(0);
    update({ status: "جاري المعالجة" });

    const exportId = crypto.randomUUID();
    const qualityLabel =
      project.quality === "standard"
        ? "720p"
        : project.quality === "ultra"
          ? "4K"
          : "1080p";

    saveExport({
      id: exportId,
      projectId: project.id,
      projectTitle: project.title,
      ratio: project.ratio,
      quality: qualityLabel,
      status: "جاري المعالجة",
      date: new Date().toISOString(),
      size: "—",
    });

    try {
      const exportProject =
        needsWatermark
          ? { ...project, brandSignature: true as const }
          : project;
      const blob = await exportProjectToVideo({
        project: exportProject,
        translationMap: project.translationEnabled ? translationMap : null,
        tafsirMap: project.tafsirEnabled ? tafsirMap : null,
        watermark: needsWatermark,
        onProgress: (pct, label) => {
          setProgress(pct);
          if (label) setProgressLabel(label);
        },
      });
      const sizeMb = (blob.size / (1024 * 1024)).toFixed(1);
      const url = downloadBlob(blob, `${project.title || "ayat"}.mp4`);

      saveExport({
        id: exportId,
        projectId: project.id,
        projectTitle: project.title,
        ratio: project.ratio,
        quality: qualityLabel,
        status: "مكتمل",
        date: new Date().toISOString(),
        size: `${sizeMb} MB`,
        videoUrl: url,
      });
      update({ status: "مكتمل" });
      toast({
        title: "تم التصدير بنجاح",
        description: needsWatermark
          ? "تم تنزيل الفيديو مع شعار عربية ستوديو (إلزامي للمسجّلين)."
          : "تم تنزيل الفيديو بدون شعار.",
      });
    } catch (err: unknown) {
      saveExport({
        id: exportId,
        projectId: project.id,
        projectTitle: project.title,
        ratio: project.ratio,
        quality: qualityLabel,
        status: "فشل",
        date: new Date().toISOString(),
        size: "—",
      });
      update({ status: "فشل" });
      const raw = err instanceof Error ? err.message : String(err || "");
      const description = /failed to fetch/i.test(raw)
        ? "تعذّر جلب الصوت أو الآيات من الخادم. حدّث الصفحة وتأكد من تسجيل الدخول."
        : raw || "حدث خطأ أثناء التصدير";
      toast({ title: "فشل التصدير", description, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPng = async () => {
    setExportingPng(true);
    try {
      if (needsWatermark && project.ratio !== "1:1") {
        toast({
          title: "ملاحظة للخطة المجانية",
          description:
            "صورة PNG للخطة المجانية قد تُصدَّر بمقاس مربع مع علامة مائية.",
        });
      }
      const exportProject =
        needsWatermark
          ? { ...project, brandSignature: true as const }
          : project;
      const blob = await exportProjectToPng(exportProject, {
        translationMap: project.translationEnabled ? translationMap : null,
        tafsirMap: project.tafsirEnabled ? tafsirMap : null,
        watermark: needsWatermark,
      });
      downloadBlob(
        blob,
        `${project.title || "ayah"}-${project.ayahStart}.png`,
      );
      toast({
        title: "تم تنزيل الصورة",
        description: `آية ${project.ayahStart} بصيغة PNG`,
      });
    } catch (err: unknown) {
      toast({
        title: "فشل تصدير الصورة",
        description: err instanceof Error ? err.message : "حدث خطأ",
        variant: "destructive",
      });
    } finally {
      setExportingPng(false);
    }
  };

  const showNav =
    (project.previewShowNavBar ?? true) && previewAyahs.length > 1;
  const showNumbers = project.previewShowAyahNumbers ?? true;
  const ayahOnly = project.previewShowAyahOnly ?? false;
  const transDur = project.transitionDuration ?? 0.6;

  return (
    <div className="studio-editor flex min-h-0 flex-col gap-3 sm:gap-4 lg:h-[calc(100dvh-var(--arabya-header-height,4.5rem)-11rem)] lg:flex-row lg:items-stretch">
      <style>{`
        @keyframes studio-fade { from { opacity: 0.15 } to { opacity: 1 } }
        @keyframes studio-slide { from { transform: translateX(28px); opacity: 0.2 } to { transform: none; opacity: 1 } }
        @keyframes studio-zoom { from { transform: scale(0.92); opacity: 0.2 } to { transform: none; opacity: 1 } }
        @keyframes studio-blur { from { filter: blur(8px); opacity: 0.2 } to { filter: none; opacity: 1 } }
        @keyframes studio-wipe { from { clip-path: inset(0 100% 0 0); opacity: 0.4 } to { clip-path: inset(0 0 0 0); opacity: 1 } }
        @keyframes studio-rise { from { transform: translateY(24px); opacity: 0.15 } to { transform: none; opacity: 1 } }
        @keyframes studio-glow { from { text-shadow: 0 0 0 transparent; opacity: 0.3 } to { opacity: 1 } }
        @keyframes studio-kenburns { from { transform: scale(1) } to { transform: scale(1.06) } }
      `}</style>

      <div className="studio-editor-controls order-2 flex max-h-[min(48vh,26rem)] w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/70 shadow-deep backdrop-blur-md sm:max-h-[min(52vh,30rem)] lg:order-1 lg:h-full lg:max-h-none lg:w-[min(100%,21rem)] lg:min-w-[17rem] xl:w-[min(100%,22rem)] 2xl:w-96">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-gradient-to-l from-primary/5 to-transparent px-3 py-3 sm:px-4 sm:py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] tracking-widest uppercase text-accent/80 sm:text-xs">
              المشروع
            </p>
            <h2 className="truncate font-display text-base font-semibold text-foreground sm:text-lg">
              {project.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleManualSave}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/30 text-accent transition hover:bg-accent/10 hover:border-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="حفظ المشروع"
            title="حفظ المشروع"
          >
            <Save className="h-4 w-4" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <EditorPanel title="القارئ والسورة" icon={BookOpen} defaultOpen>
            <Select
              value={project.reciterId}
              onValueChange={(v) => update({ reciterId: v })}
            >
              <SelectTrigger className="bg-background/50 border-accent/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {reciters.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} — {r.style} · {r.bitrate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={project.surahId.toString()}
              onValueChange={(v) => {
                const sid = Number(v);
                const meta = surahs.find((s) => s.id === sid);
                const max = meta?.ayahCount ?? 1;
                const start = Math.min(Math.max(1, project.ayahStart), max);
                let end = Math.min(Math.max(start, project.ayahEnd), max);
                if (end - start + 1 > maxAyahSpan)
                  end = Math.min(max, start + maxAyahSpan - 1);
                update({ surahId: sid, ayahStart: start, ayahEnd: end });
              }}
            >
              <SelectTrigger className="bg-background/50 border-accent/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {surahs.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    {s.id}. {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-accent">من آية</Label>
                <Input
                  type="number"
                  value={project.ayahStart}
                  onChange={(e) => {
                    const start = Math.max(1, Number(e.target.value) || 1);
                    const { start: s, end } = clampSpan(start, project.ayahEnd);
                    update({ ayahStart: s, ayahEnd: end });
                  }}
                  max={selectedSurah?.ayahCount}
                  className="bg-background/50 border-accent/20 text-center"
                />
              </div>
              <div>
                <Label className="text-xs text-accent">إلى آية</Label>
                <Input
                  type="number"
                  value={project.ayahEnd}
                  onChange={(e) => {
                    const end = Math.max(1, Number(e.target.value) || 1);
                    const { start, end: e2 } = clampSpan(project.ayahStart, end);
                    update({ ayahStart: start, ayahEnd: e2 });
                  }}
                  max={selectedSurah?.ayahCount}
                  className="bg-background/50 border-accent/20 text-center"
                />
              </div>
            </div>
            {unlimitedAyahs ? (
              <p className="text-xs text-accent/80">
                حساب سوبر أدمن: تصدير بدون حد لعدد الآيات أو السورة كاملة.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                حد التصدير {STUDIO_MAX_AYAHS} آية لكل فيديو.
              </p>
            )}
          </EditorPanel>

          <EditorPanel title="الخلفية" icon={ImageIcon}>
            <BackgroundPicker
              bgType={project.bgType}
              bgKind={project.bgKind}
              bgUrl={project.bgUrl}
              bgPoster={project.bgPoster}
              bgOpacity={project.bgOpacity ?? 100}
              ratio={project.ratio}
              onChange={(p) => update(p)}
            />
          </EditorPanel>

          <EditorPanel title="التأثيرات والانتقالات" icon={Sparkles}>
            <div>
              <Label className="text-xs text-accent">نوع الانتقال بين الآيات</Label>
              <Select
                value={project.transition || "fade"}
                onValueChange={(v) =>
                  update({ transition: v as StoredProject["transition"] })
                }
              >
                <SelectTrigger className="bg-background/50 border-accent/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {transitions.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-accent">
                مدة الانتقال: {transDur.toFixed(1)} ث
              </Label>
              <Slider
                value={[transDur * 10]}
                onValueChange={([v]) => update({ transitionDuration: v / 10 })}
                min={2}
                max={25}
                step={1}
              />
            </div>
            <div className="space-y-2 rounded-lg border border-accent/15 bg-background/30 p-3">
              <p className="text-[11px] font-medium text-accent">شريط انتقال الآيات</p>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">عرض آيات فقط</Label>
                <Switch
                  checked={ayahOnly}
                  onCheckedChange={(v) => update({ previewShowAyahOnly: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">عرض شريط الانتقال</Label>
                <Switch
                  checked={project.previewShowNavBar ?? true}
                  onCheckedChange={(v) => update({ previewShowNavBar: v })}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">عرض أرقام الآيات</Label>
                <Switch
                  checked={showNumbers}
                  onCheckedChange={(v) => update({ previewShowAyahNumbers: v })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">شعار عربية ستوديو</Label>
                <Switch
                  checked={
                    needsWatermark
                      ? true
                      : (project.brandSignature ?? true)
                  }
                  disabled={needsWatermark}
                  onCheckedChange={(v) => {
                    if (needsWatermark) return;
                    update({ brandSignature: v });
                  }}
                />
              </div>
              {needsWatermark ? (
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  حساب مسجّل: الشعار إلزامي عند التصدير ولا يمكن إخفاؤه.
                </p>
              ) : canOmitBrand ? (
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  يمكنك إخفاء الشعار عند التصدير (مؤلف / محرر / مدير).
                </p>
              ) : null}
              {(needsWatermark || (project.brandSignature ?? true)) && (
                <div className="space-y-1.5 rounded-lg border border-accent/20 bg-background/40 p-2">
                  <Label className="flex items-center gap-1 text-[11px] text-accent">
                    <MapPin className="h-3 w-3" />
                    موضع الشعار:{" "}
                    {
                      BRAND_POSITION_LABELS_AR[
                        normalizeBrandPosition(project.brandPosition)
                      ]
                    }
                  </Label>
                  <div
                    dir="ltr"
                    className="mx-auto grid w-[7.5rem] grid-cols-3 gap-1"
                    role="group"
                    aria-label="موضع شعار عربية"
                  >
                    {BRAND_POSITION_PAD.map((pos) => {
                      const active =
                        normalizeBrandPosition(project.brandPosition) === pos;
                      return (
                        <button
                          key={pos}
                          type="button"
                          title={BRAND_POSITION_LABELS_AR[pos]}
                          aria-label={BRAND_POSITION_LABELS_AR[pos]}
                          aria-pressed={active}
                          onClick={() =>
                            update({ brandPosition: pos as BrandPosition })
                          }
                          className={`flex h-7 items-center justify-center rounded-md border text-[9px] transition ${
                            active
                              ? "border-accent bg-accent/25 text-accent shadow-glow"
                              : "border-border/60 bg-card/50 text-muted-foreground hover:border-accent/40 hover:text-accent"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              active ? "bg-accent" : "bg-muted-foreground/50"
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs">ظلال vignette ناعمة</Label>
              <Switch
                checked={project.softVignette ?? true}
                onCheckedChange={(v) => update({ softVignette: v })}
              />
            </div>
          </EditorPanel>

          <EditorPanel title="مؤثرات الصوت المرئية" icon={AudioLines}>
            <div>
              <Label className="text-xs text-accent">نوع المؤثر</Label>
              <Select
                value={project.visualizer || "bars"}
                onValueChange={(v) =>
                  update({ visualizer: v as StoredProject["visualizer"] })
                }
              >
                <SelectTrigger className="bg-background/50 border-accent/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {visualizers.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-accent">
                شدة المؤثر: {project.visualizerIntensity ?? 60}%
              </Label>
              <Slider
                value={[project.visualizerIntensity ?? 60]}
                onValueChange={([v]) => update({ visualizerIntensity: v })}
                min={5}
                max={100}
                step={5}
              />
            </div>
            <ColorPickerField
              label="لون المؤثر"
              value={project.visualizerColor || "#C8A951"}
              onChange={(hex) => update({ visualizerColor: hex })}
            />
          </EditorPanel>

          <EditorPanel title="الترجمة والتفسير" icon={Languages}>
            <div className="flex items-center justify-between">
              <Label className="text-xs">إظهار الترجمة</Label>
              <Switch
                checked={project.translationEnabled}
                onCheckedChange={(v) => update({ translationEnabled: v })}
              />
            </div>
            {project.translationEnabled && (
              <>
                <Select
                  value={project.translationSlug || "saheeh-en"}
                  onValueChange={(v) => update({ translationSlug: v })}
                >
                  <SelectTrigger className="bg-background/50 border-accent/20">
                    <SelectValue placeholder="اختر ترجمة" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {(translationEditions.length
                      ? translationEditions
                      : [{ slug: "saheeh-en", nameAr: "صحيح إنترناشونال" }]
                    ).map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.nameAr}
                        {t.lang ? ` (${t.lang})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div>
                  <Label className="text-xs text-accent">
                    نص الترجمة (قابل للتعديل — الآية {ayahNum})
                  </Label>
                  <Textarea
                    value={translationText}
                    onChange={(e) => setOverride("translation", e.target.value)}
                    rows={3}
                    className="bg-background/50 border-accent/20 text-sm"
                    placeholder={
                      layersLoading ? "جاري التحميل…" : "نص الترجمة…"
                    }
                  />
                </div>
              </>
            )}
            <div className="flex items-center justify-between">
              <Label className="text-xs">إظهار التفسير</Label>
              <Switch
                checked={project.tafsirEnabled}
                onCheckedChange={(v) => update({ tafsirEnabled: v })}
              />
            </div>
            {project.tafsirEnabled && (
              <>
                <Select
                  value={project.tafsirSlug || "muyassar"}
                  onValueChange={(v) => update({ tafsirSlug: v })}
                >
                  <SelectTrigger className="bg-background/50 border-accent/20">
                    <SelectValue placeholder="اختر تفسيرًا" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {(tafsirEditions.length
                      ? tafsirEditions
                      : [{ slug: "muyassar", nameAr: "التفسير الميسر" }]
                    ).map((t) => (
                      <SelectItem key={t.slug} value={t.slug}>
                        {t.nameAr}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div>
                  <Label className="text-xs text-accent">
                    نص التفسير (قابل للتعديل — الآية {ayahNum})
                  </Label>
                  <Textarea
                    value={tafsirText}
                    onChange={(e) => setOverride("tafsir", e.target.value)}
                    rows={4}
                    className="bg-background/50 border-accent/20 text-sm"
                    placeholder={
                      layersLoading ? "جاري التحميل…" : "نص التفسير…"
                    }
                  />
                </div>
              </>
            )}
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              نص الآيات القرآنية ثابت من مصحف عربية ولا يمكن تعديله. التعديل اليدوي للترجمة والتفسير فقط.
            </p>
          </EditorPanel>

          <EditorPanel title="تنسيق النص" icon={Type}>
            <p className="text-[11px] text-accent/90 font-medium">نص الآية (ثابت المصدر)</p>
            <div>
              <Label className="text-xs text-accent">
                حجم خط الآية: {project.fontSize}px
              </Label>
              <Slider
                value={[project.fontSize]}
                onValueChange={([v]) => update({ fontSize: v })}
                min={20}
                max={80}
                step={2}
              />
            </div>
            <ColorPickerField
              label="لون نص الآية"
              value={project.textColor}
              onChange={(hex) => update({ textColor: hex })}
            />
            <div className="border-t border-accent/10 pt-3 space-y-3">
              <p className="text-[11px] text-accent/90 font-medium">نص الترجمة</p>
              <div>
                <Label className="text-xs text-accent">
                  حجم الترجمة: {project.translationFontSize ?? 22}px
                </Label>
                <Slider
                  value={[project.translationFontSize ?? 22]}
                  onValueChange={([v]) => update({ translationFontSize: v })}
                  min={12}
                  max={40}
                  step={1}
                />
              </div>
              <ColorPickerField
                label="لون الترجمة"
                value={project.translationTextColor || "#f0e6d0"}
                onChange={(hex) => update({ translationTextColor: hex })}
              />
            </div>
            <div className="border-t border-accent/10 pt-3 space-y-3">
              <p className="text-[11px] text-accent/90 font-medium">نص التفسير</p>
              <div>
                <Label className="text-xs text-accent">
                  حجم التفسير: {project.tafsirFontSize ?? 18}px
                </Label>
                <Slider
                  value={[project.tafsirFontSize ?? 18]}
                  onValueChange={([v]) => update({ tafsirFontSize: v })}
                  min={10}
                  max={32}
                  step={1}
                />
              </div>
              <ColorPickerField
                label="لون التفسير"
                value={project.tafsirTextColor || "#d4c4a8"}
                onChange={(hex) => update({ tafsirTextColor: hex })}
              />
            </div>
            <div>
              <Label className="text-xs text-accent">
                شفافية التعتيم: {project.overlayOpacity}%
              </Label>
              <Slider
                value={[project.overlayOpacity]}
                onValueChange={([v]) => update({ overlayOpacity: v })}
                min={0}
                max={100}
                step={5}
              />
            </div>
            <div>
              <Label className="text-xs text-accent">موضع النص</Label>
              <Select
                value={project.overlayPosition}
                onValueChange={(v) =>
                  update({
                    overlayPosition: v as StoredProject["overlayPosition"],
                  })
                }
              >
                <SelectTrigger className="bg-background/50 border-accent/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top">أعلى</SelectItem>
                  <SelectItem value="center">وسط</SelectItem>
                  <SelectItem value="bottom">أسفل</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </EditorPanel>

          <EditorPanel title="إعدادات الصوت" icon={Music}>
            <div>
              <Label className="text-xs text-accent">
                مستوى الصوت: {project.volume}%
              </Label>
              <Slider
                value={[project.volume]}
                onValueChange={([v]) => update({ volume: v })}
                min={0}
                max={100}
                step={5}
              />
            </div>
            <div>
              <Label className="text-xs text-accent">
                سرعة التلاوة: {(project.playbackRate ?? 1).toFixed(2)}×
              </Label>
              <Slider
                value={[Math.round((project.playbackRate ?? 1) * 100)]}
                onValueChange={([v]) => update({ playbackRate: v / 100 })}
                min={75}
                max={125}
                step={5}
              />
            </div>
            <div>
              <Label className="text-xs text-accent">
                فاصل بين الآيات: {project.pauseBetweenAyahsMs ?? 0}ms
              </Label>
              <Slider
                value={[project.pauseBetweenAyahsMs ?? 0]}
                onValueChange={([v]) => update({ pauseBetweenAyahsMs: v })}
                min={0}
                max={1500}
                step={50}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">تلاشي الدخول</Label>
              <Switch
                checked={project.fadeIn}
                onCheckedChange={(v) => update({ fadeIn: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">تلاشي الخروج</Label>
              <Switch
                checked={project.fadeOut}
                onCheckedChange={(v) => update({ fadeOut: v })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label className="text-xs">تطبيع ناعم للصوت</Label>
              <Switch
                checked={project.softNormalize ?? true}
                onCheckedChange={(v) => update({ softNormalize: v })}
              />
            </div>
          </EditorPanel>

          <EditorPanel title="إعدادات التصدير" icon={Download} defaultOpen>
            <div>
              <Label className="text-xs text-accent">المقاس / المنصة</Label>
              <Select
                value={project.ratio}
                onValueChange={(v) => update({ ratio: v })}
              >
                <SelectTrigger className="bg-background/50 border-accent/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {aspectRatios.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-accent">الجودة</Label>
              <Select
                value={project.quality}
                onValueChange={(v) =>
                  update({ quality: v as StoredProject["quality"] })
                }
              >
                <SelectTrigger className="bg-background/50 border-accent/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">عادية (720p)</SelectItem>
                  <SelectItem value="high">عالية (1080p)</SelectItem>
                  <SelectItem value="ultra">فائقة (حتى 4K حسب المقاس)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="arabya"
              size="lg"
              className="w-full"
              onClick={handleExport}
              disabled={exporting || exportingPng}
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                  {progressLabel || "جاري التصدير"} {progress}%
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" /> تصدير وتنزيل MP4
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="w-full"
              onClick={handleExportPng}
              disabled={exporting || exportingPng}
            >
              {exportingPng ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> جاري إنشاء الصورة…
                </>
              ) : (
                <>
                  <ImageIcon className="h-4 w-4" /> تصدير صورة PNG
                </>
              )}
            </Button>
            {needsWatermark && (
              <p className="text-xs text-center text-accent/90 leading-relaxed">
                الخطة المجانية: تصدير MP4 مع علامة عربية شفافة أعلى اليمين.{" "}
                <Link href="/pricing" className="underline hover:text-accent">
                  أزل العلامة مع بلس
                </Link>
              </p>
            )}
            {exporting && (
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full gradient-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </EditorPanel>
        </div>
      </div>

      <div className="studio-live-preview relative order-1 flex min-h-[min(52vh,32rem)] w-full flex-1 flex-col items-center justify-center overflow-visible rounded-2xl border border-border/70 bg-card/40 p-3 backdrop-blur-md sm:min-h-[min(56vh,36rem)] sm:p-4 lg:order-2 lg:h-full lg:min-h-0 lg:flex-1 lg:p-5">
        <div className="pattern-mihrab pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-20" />
        <div className="relative z-[1] mb-2 shrink-0 text-center text-[11px] tracking-widest uppercase text-accent/80 sm:mb-3 sm:text-xs">
          معاينة مباشرة
        </div>
        <div className="studio-live-preview__stage relative z-[1] flex min-h-0 w-full flex-1 items-center justify-center p-1 pb-12">
          <div
            className={`${previewAspect} studio-live-preview__frame relative flex flex-col overflow-visible rounded-2xl border border-primary/35 shadow-deep`}
            style={{
              /* Shrink width when height caps so the whole frame (media) stays on screen */
              width: `min(20rem, 100%, calc(min(70vh, 36rem) * ${previewAr}))`,
              maxWidth: "100%",
              height: "auto",
              maxHeight: "min(70vh, 36rem)",
              aspectRatio: `${previewRatioMeta.width} / ${previewRatioMeta.height}`,
              background:
                "linear-gradient(180deg, hsl(178 50% 18%) 0%, hsl(200 50% 8%) 100%)",
            }}
          >
          <div className="studio-live-preview__media pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl">
          {project.bgUrl && previewBgKind !== "video" && previewMedia.src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={previewMedia.src}
              src={previewMedia.src}
              alt=""
              className="absolute inset-0 z-[1] h-full w-full object-cover"
              style={{ opacity: (project.bgOpacity ?? 100) / 100 }}
            />
          )}
          {project.bgUrl && previewBgKind === "video" && previewMedia.src && (
            <video
              key={previewMedia.src}
              src={previewMedia.src}
              poster={previewMedia.poster || undefined}
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              className="absolute inset-0 z-[1] h-full w-full object-cover"
              style={{ opacity: (project.bgOpacity ?? 100) / 100 }}
              onLoadedData={(e) => {
                e.currentTarget.play().catch(() => undefined);
              }}
            />
          )}
          {project.bgUrl && previewMedia.loading && (
            <div className="absolute inset-0 z-[1] flex items-center justify-center bg-black/35">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          )}
          {project.bgUrl && previewMedia.error && !previewMedia.loading && (
            <div className="absolute inset-x-3 top-3 z-[5] rounded-md border border-destructive/40 bg-black/70 px-2 py-1.5 text-center text-[10px] text-red-200">
              {previewMedia.error}
            </div>
          )}
          <div
            className="pointer-events-none absolute inset-0 z-[2]"
            style={{ background: "#000", opacity: project.overlayOpacity / 100 }}
          />
          {(project.softVignette ?? true) && (
            <div
              className="pointer-events-none absolute inset-0 z-[2]"
              style={{
                background:
                  "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
              }}
            />
          )}
          {(project.brandSignature ?? true) && (
            <div className="pointer-events-none absolute inset-2 z-[6] rounded-xl border border-[hsl(var(--accent)/0.4)]" />
          )}
          </div>

          <div
            className={`relative z-[3] flex min-h-0 flex-1 flex-col p-4 sm:p-6 ${
              project.overlayPosition === "top"
                ? "justify-start"
                : project.overlayPosition === "bottom"
                  ? "justify-end"
                  : "justify-center"
            }`}
          >
            <div
              key={`${previewAyahIndex}-${project.transition}-${transDur}`}
              className="text-center"
              style={previewTransitionStyle(project.transition, transDur)}
            >
              {!ayahOnly && (
                <p
                  className="mb-3 text-xs tracking-widest sm:text-sm"
                  style={{ color: "hsl(var(--accent))" }}
                >
                  {selectedSurah?.name}
                  {showNumbers
                    ? ` · آية ${currentPreviewAyah?.numberInSurah ?? project.ayahStart}`
                    : ""}
                </p>
              )}
              {ayahsLoading ? (
                <p className="flex items-center justify-center gap-2 text-sm text-white/70 sm:text-base">
                  <Loader2 className="h-4 w-4 animate-spin" /> جاري تحميل نص الآيات…
                </p>
              ) : ayahsError ? (
                <p className="text-sm text-red-300 sm:text-base">{ayahsError}</p>
              ) : currentPreviewAyah ? (
                <p
                  className="font-quran leading-loose mb-2"
                  style={{
                    fontSize: `${Math.min(project.fontSize * 0.52, 30)}px`,
                    color: project.textColor,
                    textShadow: "0 2px 12px rgba(0,0,0,0.8)",
                  }}
                >
                  {currentPreviewAyah.text}
                </p>
              ) : (
                <p className="text-sm text-white/60 sm:text-base">لا يوجد نص للعرض</p>
              )}
              {project.translationEnabled && translationText ? (
                <p
                  className="mb-2 leading-relaxed"
                  style={{
                    fontSize: `${Math.min((project.translationFontSize ?? 22) * 0.62, 17)}px`,
                    color: project.translationTextColor || "#f0e6d0",
                    textShadow: "0 1px 8px rgba(0,0,0,0.7)",
                  }}
                  dir="auto"
                >
                  {translationText}
                </p>
              ) : null}
              {project.tafsirEnabled && tafsirText ? (
                <p
                  className="mb-2 leading-relaxed opacity-95"
                  style={{
                    fontSize: `${Math.min((project.tafsirFontSize ?? 18) * 0.58, 15)}px`,
                    color: project.tafsirTextColor || "#d4c4a8",
                    textShadow: "0 1px 8px rgba(0,0,0,0.7)",
                  }}
                  dir="auto"
                >
                  {tafsirText.length > 220
                    ? `${tafsirText.slice(0, 220)}…`
                    : tafsirText}
                </p>
              ) : null}
              {showNav && (
                <div className="mt-2 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-white/20 bg-black/30 p-1 text-white/80 hover:bg-black/50"
                    onClick={() =>
                      setPreviewAyahIndex((i) =>
                        clampAyahPreviewIndex(i - 1, previewAyahs.length),
                      )
                    }
                    aria-label="الآية السابقة"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <span className="text-[10px] tabular-nums text-white/60">
                    {showNumbers
                      ? `${previewAyahIndex + 1} / ${previewAyahs.length}`
                      : "•"}
                  </span>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 bg-black/30 p-1 text-white/80 hover:bg-black/50"
                    onClick={() =>
                      setPreviewAyahIndex((i) =>
                        clampAyahPreviewIndex(i + 1, previewAyahs.length),
                      )
                    }
                    aria-label="الآية التالية"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {!ayahOnly && (
            <div className="relative z-[3] flex items-end justify-between gap-2 px-3 pb-3 pt-1 sm:px-4">
              <span
                className="max-w-[70%] truncate text-[10px] sm:text-xs"
                style={{ color: "rgba(255,255,255,0.5)" }}
              >
                {selectedReciter?.name}
              </span>
            </div>
          )}

          {(needsWatermark || (project.brandSignature ?? true)) && (
            <div
              dir="ltr"
              className={`pointer-events-none absolute z-[8] flex items-center gap-1.5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)] ${brandPositionClass(
                normalizeBrandPosition(project.brandPosition),
              )}`}
              aria-label="عربية ستوديو"
            >
              <ArabyaMarkIcon size={22} className="shrink-0" />
              <div className="flex min-w-0 flex-col gap-0.5 text-start">
                <span className="font-display text-[10px] font-bold leading-none text-white sm:text-[11px]">
                  عربية ستوديو
                </span>
                <span className="text-[7px] font-medium leading-none tracking-[0.18em] text-white/75 sm:text-[8px]">
                  ARABYA • STUDIO
                </span>
              </div>
            </div>
          )}

          <AudioPreviewPlayer
            project={project}
            controlsDock="below"
            onAyahIndexChange={(idx) =>
              setPreviewAyahIndex(
                clampAyahPreviewIndex(idx, previewAyahs.length),
              )
            }
          />
        </div>
        </div>
      </div>
    </div>
  );
}
