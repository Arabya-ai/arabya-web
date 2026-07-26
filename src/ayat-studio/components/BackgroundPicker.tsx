"use client";
import { useState } from "react";
import { Upload, Link as LinkIcon, Search, Loader2, Trash2, Image as ImageIcon, Film } from "lucide-react";
import { Button } from "@/ayat-studio/components/ui/button";
import { Input } from "@/ayat-studio/components/ui/input";
import { Label } from "@/ayat-studio/components/ui/label";
import { Slider } from "@/ayat-studio/components/ui/slider";
import {
  searchPexelsPhotos,
  searchPexelsVideos,
  pickBestVideoFile,
  type PexelsPhoto,
  type PexelsVideo,
} from "@/ayat-studio/lib/pexels";
import { useToast } from "@/ayat-studio/hooks/use-toast";
import { studioMediaUrl, isAllowedStudioMediaUrl } from "@/ayat-studio/lib/media-url";

type Tab = "upload" | "url" | "search";
type MediaKind = "image" | "video";

interface Patch {
  bgType?: "none" | "image" | "url";
  bgKind?: MediaKind;
  bgUrl?: string;
  bgPoster?: string;
  bgOpacity?: number;
}

interface Props {
  bgType: "none" | "image" | "url";
  bgKind?: MediaKind;
  bgUrl: string;
  bgPoster?: string;
  bgOpacity?: number;
  ratio: string;
  onChange: (patch: Patch) => void;
}

const SUGGESTIONS = ["mosque", "nature", "mountains", "sky", "stars night", "calm sea", "forest sunrise", "desert"];

export function BackgroundPicker({ bgType, bgKind = "image", bgUrl, bgPoster = "", bgOpacity = 100, ratio, onChange }: Props) {
  const [tab, setTab] = useState<Tab>("upload");
  const [mediaKind, setMediaKind] = useState<MediaKind>(bgKind);
  const [query, setQuery] = useState("mosque");
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [videos, setVideos] = useState<PexelsVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [applyingId, setApplyingId] = useState<number | null>(null);
  const { toast } = useToast();

  const orientation = ratio === "9:16" ? "portrait" : ratio === "1:1" ? "square" : "landscape";

  const handleSearch = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    try {
      if (mediaKind === "image") {
        const res = await searchPexelsPhotos(q, { perPage: 18, orientation });
        setPhotos(res.photos);
        setVideos([]);
        if (res.photos.length === 0) toast({ title: "لا توجد نتائج", description: q });
      } else {
        const res = await searchPexelsVideos(q, { perPage: 12, orientation });
        setVideos(res.videos);
        setPhotos([]);
        if (res.videos.length === 0) toast({ title: "لا توجد فيديوهات", description: q });
      }
    } catch (e: any) {
      toast({ title: "فشل البحث", description: e?.message || "خطأ غير معروف", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = (file: File) => {
    const isVideo = file.type.startsWith("video/");
    const maxBytes = isVideo ? 8 * 1024 * 1024 : 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast({
        title: "الملف كبير جدًا",
        description: isVideo ? "الحد لفيديو الخلفية 8 ميجابايت" : "الحد لصورة الخلفية 4 ميجابايت",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        toast({ title: "تعذّر قراءة الملف", variant: "destructive" });
        return;
      }
      onChange({
        bgType: "image",
        bgKind: isVideo ? "video" : "image",
        bgUrl: dataUrl,
        bgPoster: "",
      });
      toast({ title: isVideo ? "تم تعيين فيديو الخلفية" : "تم تعيين الخلفية" });
    };
    reader.onerror = () => {
      toast({ title: "تعذّر قراءة الملف", variant: "destructive" });
    };
    reader.readAsDataURL(file);
  };

  const handlePickVideo = (v: PexelsVideo) => {
    const file = pickBestVideoFile(v, orientation);
    if (!file?.link) {
      toast({
        title: "ملف فيديو غير متاح",
        description: "جرّب نتيجة أخرى من البحث.",
        variant: "destructive",
      });
      return;
    }
    setApplyingId(v.id);
    onChange({
      bgType: "url",
      bgKind: "video",
      bgUrl: file.link,
      bgPoster: v.image || "",
    });
    toast({
      title: "تم إضافة الفيديو للمشروع",
      description: "يظهر في المعاينة (يسار/أعلى) ويُدمَج مع الآيات عند تصدير MP4.",
    });
    // Brief UI feedback on the tile
    window.setTimeout(() => setApplyingId(null), 400);
  };

  const handlePickPhoto = (url: string, photographer: string) => {
    onChange({ bgType: "url", bgKind: "image", bgUrl: url, bgPoster: "" });
    toast({
      title: "تم إضافة الصورة للمشروع",
      description: photographer ? `من ${photographer}` : "ستظهر في المعاينة والتصدير.",
    });
  };

  const tabBtn = (id: Tab, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md text-xs font-medium h-9 px-2 transition-all ${
        tab === id
          ? "gradient-gold text-accent-foreground shadow-gold"
          : "border border-accent/30 bg-background/40 hover:bg-accent/10 hover:text-accent"
      }`}
    >
      {icon} {label}
    </button>
  );

  const kindBtn = (id: MediaKind, icon: React.ReactNode, label: string) => (
    <button
      type="button"
      onClick={() => {
        setMediaKind(id);
        setPhotos([]);
        setVideos([]);
      }}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md text-[11px] font-medium h-8 px-2 transition-all ${
        mediaKind === id
          ? "bg-accent/20 text-accent border border-accent/40"
          : "border border-accent/15 bg-background/30 text-muted-foreground hover:text-accent"
      }`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-1.5">
        {tabBtn("upload", <Upload className="h-3.5 w-3.5" />, "رفع")}
        {tabBtn("url", <LinkIcon className="h-3.5 w-3.5" />, "رابط")}
        {tabBtn("search", <Search className="h-3.5 w-3.5" />, "بحث")}
      </div>

      {tab === "upload" && (
        <label className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-accent/30 bg-background/30 p-6 cursor-pointer hover:bg-accent/5 transition">
          <Upload className="h-6 w-6 text-accent/70" />
          <span className="text-xs text-muted-foreground">اختر صورة أو فيديو من جهازك</span>
          <input
            type="file"
            accept="image/*,video/mp4"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
          />
        </label>
      )}

      {tab === "url" && (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {kindBtn("image", <ImageIcon className="h-3 w-3" />, "صورة")}
            {kindBtn("video", <Film className="h-3 w-3" />, "فيديو")}
          </div>
          <Input
            placeholder={mediaKind === "video" ? "https://… (Pexels فقط) أو ارفع ملفًا" : "https://images.pexels.com/… أو ارفع ملفًا"}
            dir="ltr"
            className="text-left bg-background/50 border-accent/20"
            value={bgType === "url" ? bgUrl : ""}
            onChange={(e) => {
              const value = e.target.value.trim();
              if (value && value.startsWith("http") && !isAllowedStudioMediaUrl(value)) {
                toast({
                  title: "رابط غير مدعوم",
                  description: "للتصدير الموثوق استخدم بحث Pexels أو ارفع ملفًا من جهازك.",
                  variant: "destructive",
                });
              }
              onChange({ bgType: "url", bgKind: mediaKind, bgUrl: e.target.value, bgPoster: "" });
            }}
          />
          <p className="text-[10px] text-muted-foreground">
            الروابط الخارجية العامة قد تفشل في التصدير بسبب الحماية. الأفضل: بحث Pexels أو رفع ملف.
          </p>
        </div>
      )}

      {tab === "search" && (
        <div className="space-y-2">
          <div className="flex gap-1.5">
            {kindBtn("image", <ImageIcon className="h-3 w-3" />, "صور")}
            {kindBtn("video", <Film className="h-3 w-3" />, "فيديوهات")}
          </div>
          <div className="flex gap-1.5">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
              placeholder="ابحث: مسجد، طبيعة..."
              className="bg-background/50 border-accent/20"
            />
            <Button size="sm" variant="hero" onClick={() => handleSearch(query)} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex flex-wrap gap-1">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setQuery(s);
                  handleSearch(s);
                }}
                className="rounded-full border border-accent/20 bg-background/40 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-accent/10 hover:text-accent transition"
              >
                {s}
              </button>
            ))}
          </div>

          {mediaKind === "image" && photos.length > 0 && (
            <div className="grid max-h-72 grid-cols-3 gap-1.5 overflow-y-auto rounded-md border border-accent/15 bg-background/30 p-1.5">
              {photos.map((p) => {
                const url = orientation === "portrait" ? p.src.portrait : orientation === "landscape" ? p.src.landscape : p.src.medium;
                const selected = bgUrl === url;
                return (
                  <button
                    key={p.id}
                    onClick={() => handlePickPhoto(url, p.photographer)}
                    className={`group relative aspect-square overflow-hidden rounded transition-all ${
                      selected ? "ring-2 ring-accent shadow-gold" : "hover:ring-1 hover:ring-accent/40"
                    }`}
                    title={`${p.alt || "خلفية"} — ${p.photographer}`}
                  >
                    <img src={studioMediaUrl(p.src.medium)} alt={p.alt} loading="lazy" className="h-full w-full object-cover" />
                  </button>
                );
              })}
            </div>
          )}

          {mediaKind === "video" && videos.length > 0 && (
            <div className="grid max-h-72 grid-cols-2 gap-1.5 overflow-y-auto rounded-md border border-accent/15 bg-background/30 p-1.5">
              {videos.map((v) => {
                const file = pickBestVideoFile(v, orientation);
                const selected = !!file && bgUrl === file.link;
                const busy = applyingId === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={!file || busy}
                    onClick={() => handlePickVideo(v)}
                    className={`group relative aspect-video overflow-hidden rounded transition-all disabled:opacity-60 ${
                      selected ? "ring-2 ring-accent shadow-gold" : "hover:ring-1 hover:ring-accent/40"
                    }`}
                    title={file ? `${v.user.name} · ${v.duration}s — اضغط للإضافة` : "ملف غير متاح"}
                  >
                    <img src={studioMediaUrl(v.image)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] text-white inline-flex items-center gap-1">
                      <Film className="h-2.5 w-2.5" /> {v.duration}s
                    </span>
                    {busy && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                        <Loader2 className="h-5 w-5 animate-spin text-accent" />
                      </span>
                    )}
                    {selected && !busy && (
                      <span className="absolute top-1 right-1 rounded bg-accent px-1.5 py-0.5 text-[9px] font-medium text-accent-foreground">
                        مُضاف
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {(photos.length > 0 || videos.length > 0) && (
            <p className="text-[10px] text-muted-foreground text-center">
              اضغط على صورة/فيديو لإضافته كخلفية للمشروع — المحتوى من Pexels.
            </p>
          )}
        </div>
      )}

      {bgType !== "none" && bgUrl && (
        <>
          {(bgPoster || (bgKind === "image" && bgUrl)) && (
            <div className="overflow-hidden rounded-md border border-accent/30">
              <img
                src={studioMediaUrl(bgPoster || bgUrl)}
                alt=""
                className="h-20 w-full object-cover"
              />
              <p className="bg-accent/10 px-2 py-1 text-[10px] text-accent">
                {bgKind === "video" ? "فيديو الخلفية مُضاف للمشروع" : "صورة الخلفية مُضافة للمشروع"}
              </p>
            </div>
          )}
          <div className="space-y-1.5 pt-2 border-t border-accent/15">
            <Label className="text-xs text-accent">
              شفافية {bgKind === "video" ? "الفيديو" : "الصورة"}: {bgOpacity}%
            </Label>
            <Slider
              value={[bgOpacity]}
              onValueChange={([v]) => onChange({ bgOpacity: v })}
              min={0}
              max={100}
              step={5}
            />
            <p className="text-[10px] text-muted-foreground">يتم تشغيل فيديوهات الخلفية بدون صوت ومع تكرار تلقائي.</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ bgType: "none", bgKind: "image", bgUrl: "", bgPoster: "" })}
            className="text-destructive w-full"
          >
            <Trash2 className="h-3.5 w-3.5" /> إزالة الخلفية
          </Button>
        </>
      )}
    </div>
  );
}
