"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "@/i18n/navigation";
import { studioPath } from "@/ayat-studio/lib/studio-paths";
import { Button } from "@/ayat-studio/components/ui/button";
import { Input } from "@/ayat-studio/components/ui/input";
import { Label } from "@/ayat-studio/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ayat-studio/components/ui/select";
import { Slider } from "@/ayat-studio/components/ui/slider";
import { Switch } from "@/ayat-studio/components/ui/switch";
import { reciters, surahs, aspectRatios, transitions, visualizers } from "@/ayat-studio/lib/quran-data";
import {
  BookOpen, Image as ImageIcon, Languages, Type, Music, Download,
  ChevronDown, Loader2, Save, Sparkles, AudioLines,
} from "lucide-react";
import { getProject, saveProject, type StoredProject } from "@/ayat-studio/lib/projects-store";
import { exportProjectToVideo, downloadBlob } from "@/ayat-studio/lib/video-export";
import { saveExport } from "@/ayat-studio/lib/projects-store";
import { useToast } from "@/ayat-studio/hooks/use-toast";
import { BackgroundPicker } from "@/ayat-studio/components/BackgroundPicker";
import { AudioPreviewPlayer } from "@/ayat-studio/components/AudioPreviewPlayer";
import { useSession } from "next-auth/react";
import { canCreateVideo } from "@/lib/plans";
import { Link } from "@/i18n/navigation";

function EditorPanel({ title, icon: Icon, children, defaultOpen = false }: { title: string; icon: any; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-accent/10 last:border-b-0">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3.5 text-sm font-medium text-foreground hover:bg-accent/5 transition-colors">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
            <Icon className="h-3.5 w-3.5 text-accent" />
          </div>
          <span className="font-display">{title}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-accent/60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="px-4 pb-4 space-y-3 animate-fade-in">{children}</div>}
    </div>
  );
}

export default function Editor() {
  const params = useParams();
  const id = (params?.id as string) || "";
  const router = useRouter();
  const { toast } = useToast();
  const { data: session } = useSession();
  const plan = session?.user?.plan ?? "free";
  const plusOk = canCreateVideo(plan);
  const [project, setProject] = useState<StoredProject | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState("");

  useEffect(() => {
    if (!id) return;
    const p = getProject(id);
    if (!p) {
      toast({ title: "المشروع غير موجود", variant: "destructive" });
      router.push(studioPath("/projects"));
      return;
    }
    setProject(p);
  }, [id, router, toast]);

  if (!project) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">جاري التحميل...</div>;
  }

  const update = (patch: Partial<StoredProject>) => {
    const next = { ...project, ...patch };
    setProject(next);
    saveProject(next);
  };

  const selectedSurah = surahs.find((s) => s.id === project.surahId);
  const selectedReciter = reciters.find((r) => r.id === project.reciterId);
  const previewAspect = project.ratio === "9:16" ? "aspect-[9/16]" : project.ratio === "1:1" ? "aspect-square" : "aspect-video";

  const handleExport = async () => {
    if (!plusOk) {
      toast({
        title: "يتطلب عربية بلس",
        description: "تصدير MP4 متاح لمشتركي بلس. يمكنك استكشاف المحرر مجانًا.",
        variant: "destructive",
      });
      return;
    }
    const span = Math.max(1, project.ayahEnd - project.ayahStart + 1);
    if (span > 40) {
      toast({
        title: "نطاق الآيات طويل",
        description: "الحد الأقصى 40 آية لكل تصدير فيديو.",
        variant: "destructive",
      });
      return;
    }
    setExporting(true);
    setProgress(0);
    update({ status: "جاري المعالجة" });

    const exportId = crypto.randomUUID();
    const qualityLabel = project.quality === "standard" ? "720p" : project.quality === "ultra" ? "4K" : "1080p";

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
      const blob = await exportProjectToVideo({
        project,
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
      toast({ title: "تم التصدير بنجاح", description: "تم تنزيل الفيديو MP4 مع الصوت" });
    } catch (err: any) {
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
      const raw = String(err?.message || "");
      const description = /failed to fetch/i.test(raw)
        ? "تعذّر جلب الصوت أو الآيات من الخادم. حدّث الصفحة، تأكد من تسجيل الدخول، وحاول على Chrome."
        : raw || "حدث خطأ أثناء التصدير";
      toast({ title: "فشل التصدير", description, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportPng = async () => {
    setExportingPng(true);
    try {
      const aspect =
        project.ratio === "9:16" || project.ratio === "16:9" || project.ratio === "1:1"
          ? project.ratio
          : "1:1";
      const q = new URLSearchParams({
        s: String(project.surahId),
        v: String(project.ayahStart),
        aspect,
      });
      if (project.bgUrl && project.bgKind !== "video" && project.bgUrl.startsWith("#")) {
        q.set("bg", project.bgUrl);
      }
      const res = await fetch(`/api/create/image?${q}`, {
        credentials: "same-origin",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error === "plus_required"
            ? "مقاسات/خلفيات الصورة المتقدمة تتطلب بلس"
            : err.error === "auth_required"
              ? "يلزم تسجيل الدخول"
              : "فشل إنشاء الصورة",
        );
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.title || "ayah"}-${project.ayahStart}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "تم تنزيل الصورة", description: `آية ${project.ayahStart} بصيغة PNG` });
    } catch (err: any) {
      toast({
        title: "فشل تصدير الصورة",
        description: err?.message || "حدث خطأ",
        variant: "destructive",
      });
    } finally {
      setExportingPng(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-col gap-3 md:gap-4 xl:h-[calc(100dvh-5.5rem)] xl:flex-row xl:items-stretch">
      {/* Settings Panels */}
      <div className="order-2 flex max-h-[min(52vh,28rem)] w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-accent/20 bg-card/60 shadow-deep backdrop-blur-md sm:max-h-[min(56vh,32rem)] xl:order-1 xl:max-h-none xl:w-[min(100%,22rem)] xl:min-w-[18rem] 2xl:w-96">
        <div className="flex shrink-0 items-center justify-between border-b border-accent/15 bg-gradient-to-l from-accent/5 to-transparent px-3 py-3 sm:px-4 sm:py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-widest uppercase text-accent/70">المشروع</p>
            <h2 className="truncate font-display font-semibold text-foreground">{project.title}</h2>
          </div>
          <Save className="h-4 w-4 shrink-0 text-accent" />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">

        <EditorPanel title="القارئ والسورة" icon={BookOpen} defaultOpen>
          <Select value={project.reciterId} onValueChange={(v) => update({ reciterId: v })}>
            <SelectTrigger className="bg-background/50 border-accent/20"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {reciters.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} — {r.style} · {r.bitrate}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={project.surahId.toString()} onValueChange={(v) => update({ surahId: Number(v) })}>
            <SelectTrigger className="bg-background/50 border-accent/20"><SelectValue /></SelectTrigger>
            <SelectContent>{surahs.map((s) => <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-accent">من آية</Label>
              <Input type="number" value={project.ayahStart} onChange={(e) => update({ ayahStart: Number(e.target.value) || 1 })} min="1" className="bg-background/50 border-accent/20 text-center" />
            </div>
            <div>
              <Label className="text-xs text-accent">إلى آية</Label>
              <Input type="number" value={project.ayahEnd} onChange={(e) => update({ ayahEnd: Number(e.target.value) || 1 })} max={selectedSurah?.ayahCount} className="bg-background/50 border-accent/20 text-center" />
            </div>
          </div>
        </EditorPanel>

        <EditorPanel title="الخلفية" icon={ImageIcon}>
          <BackgroundPicker
            bgType={project.bgType}
            bgKind={project.bgKind}
            bgUrl={project.bgUrl}
            bgOpacity={project.bgOpacity ?? 100}
            ratio={project.ratio}
            onChange={(p) => update(p)}
          />
        </EditorPanel>

        <EditorPanel title="التأثيرات والانتقالات" icon={Sparkles}>
          <div>
            <Label className="text-xs text-accent">نوع الانتقال بين الآيات</Label>
            <Select value={project.transition || "fade"} onValueChange={(v: any) => update({ transition: v })}>
              <SelectTrigger className="bg-background/50 border-accent/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {transitions.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-accent">مدة الانتقال: {(project.transitionDuration ?? 0.6).toFixed(1)} ث</Label>
            <Slider
              value={[(project.transitionDuration ?? 0.6) * 10]}
              onValueChange={([v]) => update({ transitionDuration: v / 10 })}
              min={2} max={20} step={1}
            />
          </div>
        </EditorPanel>

        <EditorPanel title="مؤثرات الصوت المرئية" icon={AudioLines}>
          <div>
            <Label className="text-xs text-accent">نوع المؤثر</Label>
            <Select value={project.visualizer || "bars"} onValueChange={(v: any) => update({ visualizer: v })}>
              <SelectTrigger className="bg-background/50 border-accent/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {visualizers.map((v) => <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-accent">شدة المؤثر: {project.visualizerIntensity ?? 60}%</Label>
            <Slider
              value={[project.visualizerIntensity ?? 60]}
              onValueChange={([v]) => update({ visualizerIntensity: v })}
              min={10} max={100} step={5}
            />
          </div>
          <div>
            <Label className="text-xs text-accent mb-2 block">لون المؤثر</Label>
            <div className="flex gap-2">
              {["#C8A951", "#ffffff", "#34d399", "#60a5fa", "#f472b6"].map((c) => (
                <button
                  key={c}
                  onClick={() => update({ visualizerColor: c })}
                  className={`h-8 w-8 rounded-full border-2 transition-all ${
                    (project.visualizerColor || "#C8A951") === c ? "border-accent scale-110 shadow-glow" : "border-border hover:border-accent/50"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        </EditorPanel>

        <EditorPanel title="الترجمة والتفسير" icon={Languages}>
          <div className="flex items-center justify-between">
            <Label>إظهار الترجمة</Label>
            <Switch checked={project.translationEnabled} onCheckedChange={(v) => update({ translationEnabled: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label>إظهار التفسير</Label>
            <Switch checked={project.tafsirEnabled} onCheckedChange={(v) => update({ tafsirEnabled: v })} />
          </div>
        </EditorPanel>

        <EditorPanel title="تنسيق النص" icon={Type}>
          <div>
            <Label className="text-xs text-accent">حجم الخط: {project.fontSize}px</Label>
            <Slider value={[project.fontSize]} onValueChange={([v]) => update({ fontSize: v })} min={20} max={80} step={2} />
          </div>
          <div>
            <Label className="text-xs text-accent">شفافية الخلفية: {project.overlayOpacity}%</Label>
            <Slider value={[project.overlayOpacity]} onValueChange={([v]) => update({ overlayOpacity: v })} min={0} max={100} step={5} />
          </div>
          <div>
            <Label className="text-xs text-accent">موضع النص</Label>
            <Select value={project.overlayPosition} onValueChange={(v: any) => update({ overlayPosition: v })}>
              <SelectTrigger className="bg-background/50 border-accent/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="top">أعلى</SelectItem>
                <SelectItem value="center">وسط</SelectItem>
                <SelectItem value="bottom">أسفل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-accent mb-2 block">لون النص</Label>
            <div className="flex gap-2">
              {["#ffffff", "#f0e6d0", "#C8A951", "#e8c97f"].map((c) => (
                <button key={c} onClick={() => update({ textColor: c })} className={`h-9 w-9 rounded-full border-2 transition-all ${project.textColor === c ? "border-accent scale-110 shadow-glow" : "border-border hover:border-accent/50"}`} style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        </EditorPanel>

        <EditorPanel title="إعدادات الصوت" icon={Music}>
          <div>
            <Label className="text-xs text-accent">مستوى الصوت: {project.volume}%</Label>
            <Slider value={[project.volume]} onValueChange={([v]) => update({ volume: v })} min={0} max={100} step={5} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">تلاشي الدخول</Label>
            <Switch checked={project.fadeIn} onCheckedChange={(v) => update({ fadeIn: v })} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">تلاشي الخروج</Label>
            <Switch checked={project.fadeOut} onCheckedChange={(v) => update({ fadeOut: v })} />
          </div>
        </EditorPanel>

        <EditorPanel title="إعدادات التصدير" icon={Download} defaultOpen>
          <div>
            <Label className="text-xs text-accent">المقاس</Label>
            <Select value={project.ratio} onValueChange={(v) => update({ ratio: v })}>
              <SelectTrigger className="bg-background/50 border-accent/20"><SelectValue /></SelectTrigger>
              <SelectContent>{aspectRatios.map((a) => <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-accent">الجودة</Label>
            <Select value={project.quality} onValueChange={(v: any) => update({ quality: v })}>
              <SelectTrigger className="bg-background/50 border-accent/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">عادية (720p)</SelectItem>
                <SelectItem value="high">عالية (1080p)</SelectItem>
                <SelectItem value="ultra">فائقة (4K)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="hero" size="lg" className="w-full" onClick={handleExport} disabled={exporting || exportingPng}>
            {exporting ? <><Loader2 className="h-4 w-4 animate-spin" /> {progressLabel || "جاري التصدير"} {progress}%</> : <><Download className="h-4 w-4" /> تصدير وتنزيل MP4</>}
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
                <ImageIcon className="h-4 w-4" /> تصدير صورة PNG (الآية الأولى)
              </>
            )}
          </Button>
          {!plusOk && (
            <p className="text-xs text-center text-accent/90">
              فيديو MP4 لخطة بلس — الصورة PNG متاحة للجميع (علامة مائية + مقاس مربع 1:1 للمجاني).{" "}
              <Link href="/pricing" className="underline hover:text-accent">
                عرض الأسعار
              </Link>
            </p>
          )}
          {exporting && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full gradient-gold transition-all" style={{ width: `${progress}%` }} />
            </div>
          )}
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            الفيديو MP4 مع الصوت في المتصفح (Chrome/Edge). الصورة PNG من خادم عربية. الحد الأقصى 40 آية لكل تصدير فيديو.
          </p>
        </EditorPanel>
        </div>
      </div>

      {/* Preview Area */}
      <div className="relative order-1 flex min-h-[min(58vh,36rem)] flex-1 flex-col items-center justify-center overflow-hidden rounded-2xl border border-accent/20 bg-card/30 p-3 backdrop-blur-md sm:min-h-[min(60vh,40rem)] sm:p-4 xl:order-2 xl:min-h-0">
        <div className="pattern-mihrab pointer-events-none absolute inset-0 opacity-20" />
        <div className="relative mb-2 text-xs tracking-widest uppercase text-accent/70 sm:mb-3">
          معاينة مباشرة
        </div>
        <div
          className={`${previewAspect} relative flex w-full max-w-[min(100%,20rem)] flex-col overflow-hidden rounded-2xl border border-accent/30 shadow-deep sm:max-w-xs`}
          style={{
            maxHeight: "min(70vh, 36rem)",
            background:
              "linear-gradient(180deg, hsl(178 50% 18%) 0%, hsl(200 50% 8%) 100%)",
          }}
        >
          {project.bgUrl && project.bgKind !== "video" && (
            <img
              src={project.bgUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: (project.bgOpacity ?? 100) / 100 }}
            />
          )}
          {project.bgUrl && project.bgKind === "video" && (
            <video
              key={project.bgUrl}
              src={project.bgUrl}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover"
              style={{ opacity: (project.bgOpacity ?? 100) / 100 }}
            />
          )}
          <div className="absolute inset-0" style={{ background: "#000", opacity: project.overlayOpacity / 100 }} />

          <div className={`relative z-10 flex-1 flex flex-col p-6 ${
            project.overlayPosition === "top" ? "justify-start" :
            project.overlayPosition === "bottom" ? "justify-end" :
            "justify-center"
          }`}>
            <div className="text-center">
              <p className="mb-3 text-xs tracking-widest" style={{ color: "#C8A951" }}>
                {selectedSurah?.name} · الآيات {project.ayahStart}-{project.ayahEnd}
              </p>
              <p className="font-quran leading-loose mb-4" style={{ fontSize: `${Math.min(project.fontSize * 0.5, 28)}px`, color: project.textColor, textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
                بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ
              </p>
              {project.translationEnabled && (
                <p className="text-sm italic" style={{ color: "rgba(255,255,255,0.75)" }}>
                  In the name of Allah, the Most Gracious, the Most Merciful.
                </p>
              )}
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between px-4 pb-12">
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{selectedReciter?.name}</span>
          </div>

          <AudioPreviewPlayer project={project} />
        </div>
      </div>
    </div>
  );
}
