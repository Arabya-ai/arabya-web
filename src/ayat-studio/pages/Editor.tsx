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
      toast({ title: "فشل التصدير", description: err?.message || "حدث خطأ", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-5rem)]">
      {/* Settings Panels */}
      <div className="w-full lg:w-96 shrink-0 overflow-y-auto rounded-2xl border border-accent/20 bg-card/60 backdrop-blur-md shadow-deep">
        <div className="px-4 py-4 border-b border-accent/15 flex items-center justify-between bg-gradient-to-l from-accent/5 to-transparent">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] tracking-widest uppercase text-accent/70">المشروع</p>
            <h2 className="font-display font-semibold text-foreground truncate">{project.title}</h2>
          </div>
          <Save className="h-4 w-4 text-accent shrink-0" />
        </div>

        <EditorPanel title="القارئ والسورة" icon={BookOpen} defaultOpen>
          <Select value={project.reciterId} onValueChange={(v) => update({ reciterId: v })}>
            <SelectTrigger className="bg-background/50 border-accent/20"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-72">
              {reciters.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  <span className="flex items-center gap-2">
                    <span>{r.name}</span>
                    <span className="text-[10px] text-muted-foreground">{r.style} · {r.bitrate}</span>
                  </span>
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
          <Button variant="hero" size="lg" className="w-full" onClick={handleExport} disabled={exporting}>
            {exporting ? <><Loader2 className="h-4 w-4 animate-spin" /> {progressLabel || "جاري التصدير"} {progress}%</> : <><Download className="h-4 w-4" /> تصدير وتنزيل MP4</>}
          </Button>
          {!plusOk && (
            <p className="text-xs text-center text-accent/90">
              التصدير لخطة بلس —{" "}
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
          <p className="text-xs text-muted-foreground text-center leading-relaxed">يتم تنزيل الفيديو بصيغة MP4 مع صوت التلاوة والتأثيرات.</p>
        </EditorPanel>
      </div>

      {/* Preview Area */}
      <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-accent/20 bg-card/30 backdrop-blur-md p-4 overflow-hidden relative">
        <div className="pattern-mihrab absolute inset-0 opacity-20" />
        <div className="mb-3 text-xs tracking-widest uppercase text-accent/70 relative">معاينة مباشرة</div>
        <div
          className={`${previewAspect} w-full max-w-xs rounded-2xl shadow-deep relative overflow-hidden flex flex-col border border-accent/30`}
          style={{
            maxHeight: "70vh",
            background: "linear-gradient(180deg, hsl(178 50% 18%) 0%, hsl(200 50% 8%) 100%)",
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
