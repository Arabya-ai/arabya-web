"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { StudioFieldSelect } from "@/ayat-studio/components/StudioFieldSelect";
import { Slider } from "@/ayat-studio/components/ui/slider";
import { Switch } from "@/ayat-studio/components/ui/switch";
import {
  reciters,
  surahs,
  aspectRatios,
  transitions,
  visualizers,
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
import {
  StudioAudioPreviewProvider,
  StudioAudioTransport,
  StudioFrameAudioOverlay,
} from "@/ayat-studio/components/AudioPreviewPlayer";
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
  MEMBER_DAILY_VIDEO_EXPORT_LIMIT,
  type UserRole,
} from "@/lib/roles";
import {
  getVideoExportQuota,
  recordSuccessfulVideoExport,
} from "@/ayat-studio/lib/export-quota";
import {
  BRAND_POSITION_LABELS_AR,
  BRAND_POSITION_PAD,
  brandLockupAnchor,
  normalizeBrandPosition,
  type BrandPosition,
} from "@/ayat-studio/lib/brand-position";
import {
  BRAND_LOCKUP_AR,
  BRAND_LOCKUP_EN,
  BRAND_SITE_HOST,
  DEFAULT_SURAH_LABEL_COLOR,
  DEFAULT_SURAH_LABEL_FONT_SIZE,
  frameAyahFontPx,
  frameBrandBorderInsetPx,
  frameBrandLockupBoxH,
  estimateBrandLockupBoxW,
  brandAndReciterCollide,
  frameBrandMarkPx,
  frameBrandPadPx,
  frameBrandSubPx,
  frameBrandTitlePx,
  frameOverlayYCenter,
  frameReciterBottomPx,
  frameReciterFontPx,
  frameSurahLabelGapPx,
  frameSurahLabelPx,
  frameTafsirFontPx,
  frameTranslationFontPx,
  STUDIO_AYAH_MAX_LINES,
  STUDIO_AYAH_WIDTH_RATIO,
  STUDIO_FRAME_GRADIENT_CSS,
  STUDIO_KENBURNS_ZOOM,
  STUDIO_LAYER_WIDTH_RATIO,
  STUDIO_TAFSIR_LINE_HEIGHT,
  STUDIO_TAFSIR_MAX_LINES,
  STUDIO_TAFSIR_PREVIEW_MAX_CHARS,
  STUDIO_TRANSLATION_LINE_HEIGHT,
  STUDIO_TRANSLATION_MAX_LINES,
  frameLayerStackGapPx,
  normalizeProgressBarStyle,
  normalizeReciterPosition,
  normalizeSurahLabelFont,
  PROGRESS_BAR_STYLES,
  RECITER_POSITION_LABELS_AR,
  RECITER_POSITIONS,
  SURAH_LABEL_FONTS,
  reciterJustifyClass,
  type ProgressBarStyle,
  type ReciterPosition,
} from "@/ayat-studio/lib/frame-layout";
import {
  STUDIO_PROGRESS_GOLD,
  STUDIO_TAFSIR_TEXT,
  STUDIO_TRANSLATION_TEXT,
} from "@/lib/studio-default-colors";
import { Link } from "@/i18n/navigation";
import { useStudioPreviewSrc } from "@/ayat-studio/hooks/use-studio-preview-src";
import { ArabyaMarkIcon } from "@/ayat-studio/components/IslamicDecor";
import { fetchAyahs, type AyahData } from "@/ayat-studio/lib/quran-api";
import {
  clampAyahPreviewIndex,
  measurePreviewFrame,
  STUDIO_STACKED_LAYOUT_MAX_PX,
} from "@/ayat-studio/lib/studio-preview";
import {
  fetchStudioEditions,
  fetchTranslationMap,
  fetchTafsirMap,
  layerKey,
  resolveLayerText,
  STUDIO_LAYER_TEXT_MAX_CHARS,
  type StudioEdition,
} from "@/ayat-studio/lib/studio-layers";
import { StudioTimeline } from "@/ayat-studio/components/StudioTimeline";
import { StudioKeyboardShortcuts } from "@/ayat-studio/components/StudioKeyboardShortcuts";
import {
  EXPORT_PRESETS,
  exportPresetLabel,
  resolveExportCodec,
  resolveExportPreset,
  type ExportPresetId,
} from "@/ayat-studio/lib/export-presets";
import {
  buildCaptionCues,
  cuesToSrt,
  cuesToVtt,
  downloadCaptionFile,
} from "@/ayat-studio/lib/caption-export";
import { fetchAndDecodeAudio } from "@/ayat-studio/lib/quran-api";
import {
  CAPTION_PRESETS,
  captionPresetLabel,
  findCaptionPreset,
  type CaptionPresetId,
} from "@/ayat-studio/lib/caption-presets";

function BrandLockupLabels({
  titlePx,
  subPx,
}: {
  titlePx: number;
  subPx: number;
}) {
  const enRef = useRef<HTMLSpanElement>(null);
  const arRef = useRef<HTMLSpanElement>(null);
  const [fit, setFit] = useState({ scaleX: 1, enW: 0 });

  useLayoutEffect(() => {
    const en = enRef.current?.offsetWidth ?? 0;
    const ar = arRef.current?.offsetWidth ?? 0;
    setFit({
      scaleX: en > 0 && ar > 0 ? en / ar : 1,
      enW: en,
    });
  }, [titlePx, subPx]);

  return (
    <div className="flex min-w-0 flex-col gap-0.5 text-start">
      <div
        className="overflow-visible"
        style={{ width: fit.enW > 0 ? fit.enW : undefined }}
      >
        <span
          ref={arRef}
          className="font-display font-bold leading-none text-white whitespace-nowrap"
          style={{
            fontSize: `${titlePx}px`,
            display: "inline-block",
            transform: `scaleX(${fit.scaleX})`,
            transformOrigin: "left center",
          }}
        >
          {BRAND_LOCKUP_AR}
        </span>
      </div>
      <span
        ref={enRef}
        className="font-medium leading-none tracking-[0.18em] text-white/75 whitespace-nowrap"
        style={{ fontSize: `${subPx}px` }}
      >
        {BRAND_LOCKUP_EN}
      </span>
      <span
        className="font-medium leading-none tracking-wide text-teal-200/95 whitespace-nowrap"
        style={{ fontSize: `${Math.max(10, Math.round(subPx * 0.92))}px` }}
      >
        {BRAND_SITE_HOST}
      </span>
    </div>
  );
}

function StudioToggleRow({
  label,
  ...switchProps
}: { label: string } & React.ComponentProps<typeof Switch>) {
  return (
    <div className="studio-toggle-row">
      <Label className="text-xs leading-snug">{label}</Label>
      <Switch className="shrink-0" {...switchProps} />
    </div>
  );
}

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
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-sm font-medium text-foreground hover:bg-accent/5 transition-colors sm:px-5"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10">
            <Icon className="h-3.5 w-3.5 text-accent" />
          </div>
          <span className="min-w-0 truncate font-display text-start leading-snug">
            {title}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-accent/60 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="relative isolate space-y-4 overflow-hidden px-5 pb-5 animate-fade-in">
          {children}
        </div>
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
      // Ken Burns applies to background media in preview + export — not the text stack.
      return {};
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
  const unlimitedAyahs = canExportUnlimitedStudioAyahs(
    role,
    session?.user?.email,
  );
  const maxAyahSpan = unlimitedAyahs ? 9999 : STUDIO_MAX_AYAHS;
  const [videoQuota, setVideoQuota] = useState(() =>
    getVideoExportQuota(role, session?.user?.email ?? null),
  );

  useEffect(() => {
    setVideoQuota(getVideoExportQuota(role, session?.user?.email ?? null));
  }, [role, session?.user?.email]);

  const [project, setProject] = useState<StoredProject | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");
  const [previewAyahs, setPreviewAyahs] = useState<AyahData[]>([]);
  const [previewAyahIndex, setPreviewAyahIndex] = useState(0);
  const previewAyahCountRef = useRef(0);
  previewAyahCountRef.current = previewAyahs.length;
  const [ayahsLoading, setAyahsLoading] = useState(false);
  const [ayahsError, setAyahsError] = useState<string | null>(null);
  const [translationEditions, setTranslationEditions] = useState<StudioEdition[]>([]);
  const [tafsirEditions, setTafsirEditions] = useState<StudioEdition[]>([]);
  const [translationMap, setTranslationMap] = useState<Record<number, string> | null>(null);
  const [tafsirMap, setTafsirMap] = useState<Record<number, string> | null>(null);
  const [layersLoading, setLayersLoading] = useState(false);
  const previewFrameRef = useRef<HTMLDivElement>(null);
  const previewStageRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<number | undefined>(undefined);
  const [frameWidth, setFrameWidth] = useState(320);
  const [frameHeight, setFrameHeight] = useState(568);
  const [previewFrameSize, setPreviewFrameSize] = useState({
    width: 280,
    height: 498,
  });

  useEffect(() => {
    return () => {
      window.clearTimeout(saveTimerRef.current);
    };
  }, []);
  useLayoutEffect(() => {
    if (!project) return;
    const stage = previewStageRef.current;
    if (!stage) return;
    const ratioMeta =
      aspectRatios.find((r) => r.id === project.ratio) ?? aspectRatios[0];

    const measure = () => {
      const stacked =
        window.matchMedia(`(max-width: ${STUDIO_STACKED_LAYOUT_MAX_PX}px)`)
          .matches;
      const fitted = measurePreviewFrame({
        stageW: stage.clientWidth,
        stageH: stage.clientHeight,
        aspectW: ratioMeta.width,
        aspectH: ratioMeta.height,
        viewportH: window.innerHeight,
        stacked,
      });
      if (fitted.width > 0 && fitted.height > 0) {
        setPreviewFrameSize((prev) =>
          prev.width === fitted.width && prev.height === fitted.height
            ? prev
            : fitted,
        );
        const fw = Math.round(fitted.width);
        const fh = Math.round(fitted.height);
        setFrameWidth((w) => (w === fw ? w : fw));
        setFrameHeight((h) => (h === fh ? h : fh));
      }
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(stage);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [project?.ratio, project?.id]);

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
      reciterPosition: normalizeReciterPosition(p.reciterPosition),
      progressBarStyle: normalizeProgressBarStyle(p.progressBarStyle),
      progressBarColor: p.progressBarColor || STUDIO_PROGRESS_GOLD,
      translationSlug: p.translationSlug || "saheeh-en",
      tafsirSlug: p.tafsirSlug || "muyassar",
      translationFontSize: p.translationFontSize ?? 22,
      translationTextColor: p.translationTextColor || STUDIO_TRANSLATION_TEXT,
      tafsirFontSize: p.tafsirFontSize ?? 18,
      tafsirTextColor: p.tafsirTextColor || STUDIO_TAFSIR_TEXT,
      surahLabelFontSize: p.surahLabelFontSize ?? DEFAULT_SURAH_LABEL_FONT_SIZE,
      surahLabelTextColor: p.surahLabelTextColor || DEFAULT_SURAH_LABEL_COLOR,
      surahLabelFontFamily: normalizeSurahLabelFont(p.surahLabelFontFamily),
      playbackRate: p.playbackRate ?? 1,
      softNormalize: p.softNormalize ?? true,
      pauseBetweenAyahsMs: p.pauseBetweenAyahsMs ?? 0,
    });
    // Only re-load when the project id changes — not when toast identity changes.
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
    const range = {
      from: project.ayahStart,
      to: project.ayahEnd,
    };
    const load = async () => {
      if (!project.translationEnabled && !project.tafsirEnabled) {
        setTranslationMap(null);
        setTafsirMap(null);
        setLayersLoading(false);
        return;
      }
      setLayersLoading(true);
      try {
        const [tr, tf] = await Promise.all([
          project.translationEnabled && project.translationSlug
            ? fetchTranslationMap(
                project.translationSlug,
                project.surahId,
                range,
              )
            : Promise.resolve(null),
          project.tafsirEnabled && project.tafsirSlug
            ? fetchTafsirMap(project.tafsirSlug, project.surahId, range)
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
    project?.ayahStart,
    project?.ayahEnd,
    project?.translationEnabled,
    project?.tafsirEnabled,
    project?.translationSlug,
    project?.tafsirSlug,
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
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
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
    }, 400);
  };

  const clampSpan = (start: number, end: number) => {
    let s = Math.max(1, start);
    let e = Math.max(s, end);
    if (e - s + 1 > maxAyahSpan) e = s + maxAyahSpan - 1;
    return { start: s, end: e };
  };

  const selectedSurah = surahs.find((s) => s.id === project.surahId);
  const selectedReciter = reciters.find((r) => r.id === project.reciterId);
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
    const quotaNow = getVideoExportQuota(role, session?.user?.email ?? null);
    if (quotaNow.blocked) {
      toast({
        title: "تم استهلاك الحد اليومي",
        description: `الخطة المجانية تسمح بـ ${MEMBER_DAILY_VIDEO_EXPORT_LIMIT} فيديوهات ناجحة يوميًا. حاول مجددًا غدًا.`,
        variant: "destructive",
      });
      setVideoQuota(quotaNow);
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
    const preset = resolveExportPreset(project);
    const qualityLabel = exportPresetLabel(preset, "ar");

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
      const ext = resolveExportCodec(project) === "vp9-webm" ? "webm" : "mp4";
      const url = downloadBlob(blob, `${project.title || "ayat"}.${ext}`);

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
      const after = recordSuccessfulVideoExport(
        role,
        session?.user?.email ?? null,
      );
      setVideoQuota(after);
      toast({
        title: "تم التصدير بنجاح",
        description: needsWatermark
          ? after.limit != null
            ? `تم التنزيل مع الشعار · متبقٍ اليوم ${after.remaining} من ${after.limit}`
            : "تم تنزيل الفيديو مع شعار عربية ستوديو (إلزامي للمسجّلين)."
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

  const handleExportCaptions = async (format: "srt" | "vtt") => {
    setExporting(true);
    try {
      const ayahs = await fetchAyahs(
        project.surahId,
        project.ayahStart,
        project.ayahEnd,
        project.reciterId,
      );
      if (ayahs.length === 0) throw new Error("لم يتم العثور على آيات");
      const audioCtx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      const { segments } = await fetchAndDecodeAudio(ayahs, audioCtx, {
        pauseBetweenAyahsMs: project.pauseBetweenAyahsMs ?? 0,
        softNormalize: project.softNormalize ?? true,
      });
      await audioCtx.close().catch(() => {});
      const cues = buildCaptionCues({
        ayahNumbers: ayahs.map((a) => a.numberInSurah),
        segments,
        arabicTexts: ayahs.map((a) => a.text),
        translationMap: project.translationEnabled ? translationMap : null,
      });
      if (cues.length === 0) throw new Error("لا توجد ترجمات أو نصوص للتصدير");
      const base = `${project.title || "ayat"}-captions`;
      if (format === "srt") {
        downloadCaptionFile(cuesToSrt(cues), `${base}.srt`, "text/plain");
      } else {
        downloadCaptionFile(cuesToVtt(cues), `${base}.vtt`, "text/vtt");
      }
      toast({ title: "تم تصدير الترجمة", description: format.toUpperCase() });
    } catch (err: unknown) {
      toast({
        title: "فشل تصدير الترجمة",
        description: err instanceof Error ? err.message : "حدث خطأ",
        variant: "destructive",
      });
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
  const brandMark = frameBrandMarkPx(frameWidth);
  const brandTitlePx = frameBrandTitlePx(frameWidth);
  const brandSubPx = frameBrandSubPx(frameWidth);
  const brandPad = frameBrandPadPx(frameWidth);
  const brandGap = Math.round(brandMark * 0.22);
  const brandBoxW = estimateBrandLockupBoxW(frameWidth);
  const brandBoxH = frameBrandLockupBoxH(frameWidth);
  const showBrandLockup =
    needsWatermark || (project.brandSignature ?? true);
  const brandPos = normalizeBrandPosition(project.brandPosition);
  const reciterPos = normalizeReciterPosition(project.reciterPosition);
  const brandAnchor = brandLockupAnchor(
    brandPos,
    frameWidth,
    frameHeight,
    brandBoxW,
    brandBoxH,
    brandPad,
  );
  const overlayYCenter = frameOverlayYCenter(
    project.overlayPosition,
    frameHeight,
  );
  const ayahFontPx = frameAyahFontPx(project.fontSize, frameWidth);
  const layerStackGapPx = frameLayerStackGapPx(ayahFontPx);
  const reciterBottom = frameReciterBottomPx(frameHeight, {
    collideWithBrand: brandAndReciterCollide(
      brandPos,
      reciterPos,
      showBrandLockup && !ayahOnly,
    ),
    brandBoxH,
    brandPad,
  });

  return (
    <div className="studio-editor flex h-full min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:flex-row lg:items-stretch lg:gap-4">
      <style>{`
        @keyframes studio-fade { from { opacity: 0.15 } to { opacity: 1 } }
        @keyframes studio-slide { from { transform: translateX(28px); opacity: 0.2 } to { transform: none; opacity: 1 } }
        @keyframes studio-zoom { from { transform: scale(0.92); opacity: 0.2 } to { transform: none; opacity: 1 } }
        @keyframes studio-blur { from { filter: blur(8px); opacity: 0.2 } to { filter: none; opacity: 1 } }
        @keyframes studio-wipe { from { clip-path: inset(0 100% 0 0); opacity: 0.4 } to { clip-path: inset(0 0 0 0); opacity: 1 } }
        @keyframes studio-rise { from { transform: translateY(24px); opacity: 0.15 } to { transform: none; opacity: 1 } }
        @keyframes studio-glow { from { text-shadow: 0 0 0 transparent; opacity: 0.3 } to { opacity: 1 } }
        @keyframes studio-kenburns { from { transform: scale(1) } to { transform: scale(${1 + STUDIO_KENBURNS_ZOOM}) } }
      `}</style>

      <div className="studio-editor-controls order-1 flex w-full min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-[hsl(var(--card))] shadow-deep lg:order-1 lg:h-full lg:min-h-0 lg:w-[22rem] lg:flex-none xl:w-[24rem] 2xl:w-[26rem]">
        <div className="relative z-10 flex shrink-0 items-center justify-between gap-2 border-b border-border/60 bg-[hsl(var(--card))] px-4 py-4 sm:px-5 sm:py-4">
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
        <div className="relative z-0 min-h-0 flex-1 overflow-y-auto overscroll-contain bg-[hsl(var(--card))]">
          <EditorPanel title="القارئ والسورة" icon={BookOpen} defaultOpen>
            <div className="space-y-3">
            <StudioFieldSelect
              aria-label="القارئ"
              value={project.reciterId}
              onValueChange={(v) => update({ reciterId: v })}
              triggerClassName="border-accent/20"
              contentClassName="max-h-72"
              options={reciters.map((r) => ({
                value: r.id,
                label: `${r.name} — ${r.style} · ${r.bitrate}`,
              }))}
            />
            <StudioFieldSelect
              aria-label="السورة"
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
              triggerClassName="border-accent/20"
              contentClassName="max-h-72"
              options={surahs.map((s) => ({
                value: s.id.toString(),
                label: `${s.id}. ${s.name}`,
              }))}
            />
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
                  className="border-accent/20 bg-[hsl(var(--background))] text-center"
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
                  className="border-accent/20 bg-[hsl(var(--background))] text-center"
                />
              </div>
            </div>
            {unlimitedAyahs ? (
              <p className="text-xs text-accent/80">
                حسابك: تصدير بدون حد لعدد الآيات أو السورة كاملة.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                حد التصدير {STUDIO_MAX_AYAHS} آية لكل فيديو (خطة مجانية).
              </p>
            )}
            </div>
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
                <SelectTrigger className="border-accent/20">
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
            <div className="space-y-2.5 rounded-lg border border-accent/15 bg-[hsl(var(--background))] p-3">
              <p className="text-[11px] font-medium text-accent">شريط انتقال الآيات</p>
              <StudioToggleRow
                label="عرض آيات فقط"
                checked={ayahOnly}
                onCheckedChange={(v) => update({ previewShowAyahOnly: v })}
              />
              <StudioToggleRow
                label="عرض شريط الانتقال"
                checked={project.previewShowNavBar ?? true}
                onCheckedChange={(v) => update({ previewShowNavBar: v })}
              />
              <StudioToggleRow
                label="عرض أرقام الآيات"
                checked={showNumbers}
                onCheckedChange={(v) => update({ previewShowAyahNumbers: v })}
              />
            </div>
            <div className="space-y-2">
              <StudioToggleRow
                label="شعار عربية ستوديو"
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
                    className="studio-position-pad mx-auto grid w-[7.5rem] grid-cols-3 gap-1"
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
                          className="studio-position-btn flex h-7 items-center justify-center rounded-md border text-[9px] transition"
                        >
                          <span className="studio-position-dot h-1.5 w-1.5 rounded-full" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <StudioToggleRow
              label="ظلال vignette ناعمة"
              checked={project.softVignette ?? true}
              onCheckedChange={(v) => update({ softVignette: v })}
            />
            <div className="space-y-3 rounded-lg border border-accent/15 bg-[hsl(var(--background))] p-3">
              <Label className="text-xs text-accent">اسم القارئ</Label>
              <Select
                value={normalizeReciterPosition(project.reciterPosition)}
                onValueChange={(v) =>
                  update({ reciterPosition: v as ReciterPosition })
                }
              >
                <SelectTrigger className="border-accent/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECITER_POSITIONS.map((pos) => (
                    <SelectItem key={pos} value={pos}>
                      {RECITER_POSITION_LABELS_AR[pos]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3 rounded-lg border border-accent/15 bg-[hsl(var(--background))] p-3">
              <Label className="text-xs text-accent">شريط التقدم داخل الإطار</Label>
              <Select
                value={normalizeProgressBarStyle(project.progressBarStyle)}
                onValueChange={(v) =>
                  update({ progressBarStyle: v as ProgressBarStyle })
                }
              >
                <SelectTrigger className="border-accent/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROGRESS_BAR_STYLES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {normalizeProgressBarStyle(project.progressBarStyle) !== "none" && (
                <ColorPickerField
                  label="لون شريط التقدم"
                  value={project.progressBarColor || STUDIO_PROGRESS_GOLD}
                  onChange={(hex) => update({ progressBarColor: hex })}
                />
              )}
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                الافتراضي: بدون شريط — ليطابق المعاينة. فعّله ليظهر في المعاينة والتصدير معًا.
              </p>
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
                <SelectTrigger className="border-accent/20">
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
              value={project.visualizerColor || STUDIO_PROGRESS_GOLD}
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
                  <SelectTrigger className="border-accent/20">
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
                    value={translationText.slice(0, STUDIO_LAYER_TEXT_MAX_CHARS)}
                    onChange={(e) => setOverride("translation", e.target.value)}
                    rows={3}
                    className="border-accent/20 bg-[hsl(var(--background))] text-sm"
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
                  <SelectTrigger className="border-accent/20">
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
                    value={tafsirText.slice(0, STUDIO_LAYER_TEXT_MAX_CHARS)}
                    onChange={(e) => setOverride("tafsir", e.target.value)}
                    rows={4}
                    className="border-accent/20 bg-[hsl(var(--background))] text-sm"
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
            <div>
              <Label className="text-xs text-accent">نمط النص (Captions)</Label>
              <Select
                value={project.captionPresetId ?? "classic-gold"}
                onValueChange={(v) => {
                  const preset = findCaptionPreset(v);
                  update({
                    captionPresetId: v as CaptionPresetId,
                    ...(preset?.patch ?? {}),
                  });
                }}
              >
                <SelectTrigger className="border-accent/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CAPTION_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {captionPresetLabel(p, "ar")}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">مخصص (الإعدادات الحالية)</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
              <p className="text-[11px] text-accent/90 font-medium">تسمية السورة والآية</p>
              <div>
                <Label className="text-xs text-accent">
                  حجم التسمية: {project.surahLabelFontSize ?? DEFAULT_SURAH_LABEL_FONT_SIZE}px
                </Label>
                <Slider
                  value={[project.surahLabelFontSize ?? DEFAULT_SURAH_LABEL_FONT_SIZE]}
                  onValueChange={([v]) => update({ surahLabelFontSize: v })}
                  min={10}
                  max={36}
                  step={1}
                />
              </div>
              <div>
                <Label className="text-xs text-accent">نوع خط التسمية</Label>
                <Select
                  value={normalizeSurahLabelFont(project.surahLabelFontFamily)}
                  onValueChange={(v) => update({ surahLabelFontFamily: v })}
                >
                  <SelectTrigger className="border-accent/20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SURAH_LABEL_FONTS.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ColorPickerField
                label="لون التسمية"
                value={project.surahLabelTextColor || DEFAULT_SURAH_LABEL_COLOR}
                onChange={(hex) => update({ surahLabelTextColor: hex })}
              />
            </div>
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
                value={project.translationTextColor || STUDIO_TRANSLATION_TEXT}
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
                value={project.tafsirTextColor || STUDIO_TAFSIR_TEXT}
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
                <SelectTrigger className="border-accent/20">
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
                <SelectTrigger className="border-accent/20">
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
              <Label className="text-xs text-accent">إعداد التصدير / المنصة</Label>
              <Select
                value={project.exportPresetId ?? "youtube-1080"}
                onValueChange={(v) => {
                  const preset = EXPORT_PRESETS.find((p) => p.id === v);
                  update({
                    exportPresetId: v as ExportPresetId,
                    quality: preset?.quality ?? project.quality,
                    exportCodec: preset?.codec,
                  });
                }}
              >
                <SelectTrigger className="border-accent/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  {EXPORT_PRESETS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {exportPresetLabel(p, "ar")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-accent">الجودة (احتياطي)</Label>
              <Select
                value={project.quality}
                onValueChange={(v) =>
                  update({
                    quality: v as StoredProject["quality"],
                    exportPresetId: "custom",
                  })
                }
              >
                <SelectTrigger className="border-accent/20">
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
              disabled={exporting || exportingPng || videoQuota.blocked}
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />{" "}
                  {progressLabel || "جاري التصدير"} {progress}%
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />{" "}
                  {resolveExportCodec(project) === "vp9-webm"
                    ? "تصدير WebM"
                    : "تصدير MP4"}
                </>
              )}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={exporting || exportingPng}
                onClick={() => void handleExportCaptions("srt")}
              >
                SRT
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={exporting || exportingPng}
                onClick={() => void handleExportCaptions("vtt")}
              >
                VTT
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              اختصارات: مسافة تشغيل/إيقاف · ←/→ للتقديم · Home/End
            </p>
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
                المسجّلون: تصدير MP4 مع شعار عربية ستوديو
                {videoQuota.limit != null
                  ? ` · ${videoQuota.used}/${videoQuota.limit} اليوم`
                  : ""}
                . المؤلف/المحرر/السوبر أدمن بلا شعار إلزامي وبلا حد يومي.
              </p>
            )}
            {videoQuota.blocked && (
              <p className="text-xs text-center text-destructive leading-relaxed">
                وصلت لحد {MEMBER_DAILY_VIDEO_EXPORT_LIMIT} فيديوهات اليوم. يعود العدد غدًا.
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

      <StudioAudioPreviewProvider
        project={project}
        onAyahIndexChange={(idx) => {
          setPreviewAyahIndex((prev) => {
            const next = clampAyahPreviewIndex(
              idx,
              previewAyahCountRef.current,
            );
            return prev === next ? prev : next;
          });
        }}
      >
        <StudioKeyboardShortcuts />
        <div className="studio-live-preview relative order-2 flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-[hsl(var(--card))] p-2 shadow-deep sm:p-3 lg:order-2 lg:h-full lg:p-3">
          <div className="pattern-mihrab pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-20" />
          <div className="relative z-[1] mb-1 shrink-0 text-center text-[11px] tracking-widest uppercase text-accent/80 sm:text-xs">
            معاينة مباشرة
          </div>
          <div
            ref={previewStageRef}
            className="studio-live-preview__stage relative z-[1] flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden"
          >
            <div
              ref={previewFrameRef}
              className="studio-live-preview__frame relative overflow-hidden rounded-2xl border border-primary/35 shadow-deep"
              style={{
                width: `${previewFrameSize.width}px`,
                height: `${previewFrameSize.height}px`,
                maxWidth: "100%",
                maxHeight: "100%",
                background: STUDIO_FRAME_GRADIENT_CSS,
              }}
            >
              <div className="studio-live-preview__media pointer-events-none absolute inset-0 z-0 overflow-hidden rounded-2xl">
                {project.bgUrl && previewBgKind !== "video" && previewMedia.src && (
                  <img
                    key={previewMedia.src}
                    src={previewMedia.src}
                    alt=""
                    className="absolute inset-0 z-[1] h-full w-full object-cover"
                    style={{
                      opacity: (project.bgOpacity ?? 100) / 100,
                      ...(project.transition === "kenburns"
                        ? {
                            animation: `studio-kenburns ${Math.max(transDur, 4)}s linear infinite`,
                          }
                        : null),
                    }}
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
                    style={{
                      opacity: (project.bgOpacity ?? 100) / 100,
                      ...(project.transition === "kenburns"
                        ? {
                            animation: `studio-kenburns ${Math.max(transDur, 4)}s linear infinite`,
                          }
                        : null),
                    }}
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
                  className="pointer-events-none absolute inset-0 z-[2] studio-editor-stage-bg"
                  style={{ opacity: project.overlayOpacity / 100 }}
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
                {(needsWatermark || (project.brandSignature ?? true)) && (
                  <div
                    className="pointer-events-none absolute z-[6] rounded-xl border border-[rgba(200,169,81,0.4)]"
                    style={{
                      inset: frameBrandBorderInsetPx(frameWidth),
                    }}
                  />
                )}
              </div>

              <div
                className="pointer-events-none absolute inset-x-0 z-[3] text-center"
                style={{
                  top: overlayYCenter,
                  transform: "translateY(-50%)",
                  paddingInline: `${((1 - STUDIO_AYAH_WIDTH_RATIO) / 2) * 100}%`,
                }}
              >
                <div
                  key={`${previewAyahIndex}-${project.transition}-${transDur}`}
                  style={previewTransitionStyle(project.transition, transDur)}
                >
                  {!ayahOnly && (
                    <p
                      className="tracking-widest"
                      style={{
                        color:
                          project.surahLabelTextColor ||
                          DEFAULT_SURAH_LABEL_COLOR,
                        fontSize: `${frameSurahLabelPx(
                          project.surahLabelFontSize ??
                            DEFAULT_SURAH_LABEL_FONT_SIZE,
                          frameWidth,
                        )}px`,
                        fontFamily: `"${normalizeSurahLabelFont(
                          project.surahLabelFontFamily,
                        )}", "IBM Plex Sans Arabic", sans-serif`,
                        lineHeight: 1,
                        marginBottom: `${frameSurahLabelGapPx(
                          frameSurahLabelPx(
                            project.surahLabelFontSize ??
                              DEFAULT_SURAH_LABEL_FONT_SIZE,
                            frameWidth,
                          ),
                          frameHeight,
                        )}px`,
                        textShadow: "0 2px 8px rgba(0,0,0,0.55)",
                      }}
                    >
                      {selectedSurah?.name}
                      {showNumbers
                        ? ` · آية ${currentPreviewAyah?.numberInSurah ?? project.ayahStart}`
                        : ""}
                    </p>
                  )}
                  {ayahsLoading ? (
                    <p className="flex items-center justify-center gap-2 text-sm text-white/70 sm:text-base">
                      <Loader2 className="h-4 w-4 animate-spin" /> جاري تحميل
                      نص الآيات…
                    </p>
                  ) : ayahsError ? (
                    <p className="text-sm text-red-300 sm:text-base">
                      {ayahsError}
                    </p>
                  ) : currentPreviewAyah ? (
                    <p
                      className="font-quran font-bold"
                      style={{
                        fontSize: `${ayahFontPx}px`,
                        color: project.textColor,
                        lineHeight: 1.95,
                        textShadow: "0 2px 12px rgba(0,0,0,0.8)",
                        marginBottom:
                          project.translationEnabled || project.tafsirEnabled
                            ? layerStackGapPx
                            : 0,
                        display: "-webkit-box",
                        WebkitLineClamp: STUDIO_AYAH_MAX_LINES,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: "hidden",
                      }}
                    >
                      {currentPreviewAyah.text}
                    </p>
                  ) : (
                    <p className="text-sm text-white/60 sm:text-base">
                      لا يوجد نص للعرض
                    </p>
                  )}
                  {project.translationEnabled && translationText ? (
                    <p
                      className="leading-relaxed"
                      style={{
                        fontSize: `${frameTranslationFontPx(
                          project.translationFontSize ?? 22,
                          frameWidth,
                        )}px`,
                        color: project.translationTextColor || STUDIO_TRANSLATION_TEXT,
                        textShadow: "0 1px 8px rgba(0,0,0,0.7)",
                        lineHeight: STUDIO_TRANSLATION_LINE_HEIGHT,
                        width: `${(STUDIO_LAYER_WIDTH_RATIO / STUDIO_AYAH_WIDTH_RATIO) * 100}%`,
                        marginInline: "auto",
                        marginBottom: project.tafsirEnabled
                          ? layerStackGapPx
                          : 0,
                        display: "-webkit-box",
                        WebkitLineClamp: STUDIO_TRANSLATION_MAX_LINES,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: "hidden",
                      }}
                      dir="auto"
                    >
                      {translationText}
                    </p>
                  ) : null}
                  {project.tafsirEnabled && tafsirText ? (
                    <p
                      className="leading-relaxed opacity-95"
                      style={{
                        fontSize: `${frameTafsirFontPx(
                          project.tafsirFontSize ?? 18,
                          frameWidth,
                        )}px`,
                        color: project.tafsirTextColor || STUDIO_TAFSIR_TEXT,
                        textShadow: "0 1px 8px rgba(0,0,0,0.7)",
                        lineHeight: STUDIO_TAFSIR_LINE_HEIGHT,
                        width: `${(STUDIO_LAYER_WIDTH_RATIO / STUDIO_AYAH_WIDTH_RATIO) * 100}%`,
                        marginInline: "auto",
                        display: "-webkit-box",
                        WebkitLineClamp: STUDIO_TAFSIR_MAX_LINES,
                        WebkitBoxOrient: "vertical" as const,
                        overflow: "hidden",
                      }}
                      dir="auto"
                    >
                      {tafsirText.length > STUDIO_TAFSIR_PREVIEW_MAX_CHARS
                        ? `${tafsirText.slice(0, STUDIO_TAFSIR_PREVIEW_MAX_CHARS)}…`
                        : tafsirText}
                    </p>
                  ) : null}
                </div>
              </div>

              {showNav && (
                <div className="pointer-events-auto absolute inset-x-0 z-[4] flex items-center justify-center gap-2"
                  style={{ top: overlayYCenter + frameHeight * 0.12 }}
                >
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

              {!ayahOnly &&
                reciterPos !== "hidden" && (
                  <div
                    dir="ltr"
                    className={`pointer-events-none absolute inset-x-0 z-[3] flex px-[4%] ${reciterJustifyClass(
                      reciterPos,
                    )}`}
                    style={{ bottom: reciterBottom }}
                  >
                    <span
                      className="max-w-[80%] truncate"
                      style={{
                        color: "rgba(255,255,255,0.55)",
                        fontSize: `${frameReciterFontPx(frameWidth)}px`,
                      }}
                    >
                      {selectedReciter?.name}
                    </span>
                  </div>
                )}

              <StudioFrameAudioOverlay
                project={project}
                frameWidth={frameWidth}
                frameHeight={frameHeight}
              />

              {showBrandLockup && (
                <div
                  dir="ltr"
                  className="pointer-events-none absolute z-[8] flex items-center drop-shadow-[0_1px_3px_rgba(0,0,0,0.65)]"
                  style={{
                    left: brandAnchor.x,
                    top: brandAnchor.y,
                    gap: brandGap,
                  }}
                  aria-label="عربية ستوديو"
                >
                  <ArabyaMarkIcon size={brandMark} className="shrink-0" />
                  <BrandLockupLabels
                    titlePx={brandTitlePx}
                    subPx={brandSubPx}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="relative z-[1] w-full shrink-0 pb-1">
            <StudioTimeline
              ayahLabels={previewAyahs.map(
                (a) => `${project.surahId}:${a.numberInSurah}`,
              )}
              activeAyahIndex={previewAyahIndex}
            />
            <StudioAudioTransport controlsDock="below" />
          </div>
        </div>
      </StudioAudioPreviewProvider>
    </div>
  );
}
