"use client";
import { Button } from "@/ayat-studio/components/ui/button";
import { Card, CardContent } from "@/ayat-studio/components/ui/card";
import { Input } from "@/ayat-studio/components/ui/input";
import { Label } from "@/ayat-studio/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ayat-studio/components/ui/select";
import { useRouter } from "@/i18n/navigation";
import { studioPath } from "@/ayat-studio/lib/studio-paths";
import { useState } from "react";
import { reciters, surahs, aspectRatios } from "@/ayat-studio/lib/quran-data";
import { createDefaultProject } from "@/ayat-studio/lib/projects-store";
import { useToast } from "@/ayat-studio/hooks/use-toast";
import { ArabesqueMedallion } from "@/ayat-studio/components/IslamicDecor";
import { BookOpen, Mic2, Film, Sparkles, ArrowLeft } from "lucide-react";

export default function NewProject() {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [reciterId, setReciterId] = useState("Alafasy_128kbps");
  const [surahId, setSurahId] = useState("55");
  const [ayahStart, setAyahStart] = useState("1");
  const [ayahEnd, setAyahEnd] = useState("13");
  const [ratio, setRatio] = useState("9:16");

  const selectedSurah = surahs.find((s) => s.id.toString() === surahId);

  const handleCreate = () => {
    if (!title.trim()) {
      toast({ title: "اسم المشروع مطلوب", variant: "destructive" });
      return;
    }
    if (!reciterId || !surahId) {
      toast({ title: "اختر القارئ والسورة", variant: "destructive" });
      return;
    }
    const project = createDefaultProject({
      title: title.trim(),
      reciterId,
      surahId: Number(surahId),
      ayahStart: Number(ayahStart) || 1,
      ayahEnd: Number(ayahEnd) || Number(ayahStart) || 1,
      ratio,
    });
    toast({ title: "تم إنشاء المشروع", description: "هيا نبدأ التصميم!" });
    router.push(studioPath(`/editor/${project.id}`));
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <ArabesqueMedallion size={56} className="mx-auto mb-4 text-accent animate-pulse-glow" />
        <p className="mb-2 text-xs tracking-[0.3em] uppercase text-accent">بداية جديدة</p>
        <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
          أنشئ <span className="text-gradient-gold">تحفتك</span> القادمة
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">حدد التلاوة والمقاس، والباقي علينا</p>
      </div>

      <Card className="relative overflow-hidden border-accent/20 bg-card/50 backdrop-blur-sm shadow-deep">
        <div className="pattern-stars absolute inset-0 opacity-20" />
        <CardContent className="relative space-y-6 p-6 md:p-8">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="flex items-center gap-2 text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              اسم المشروع
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: سورة الرحمن — ريلز"
              className="h-12 bg-background/50 border-accent/20 focus:border-accent"
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {/* Reciter */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-accent">
                <Mic2 className="h-3.5 w-3.5" />
                القارئ
              </Label>
              <Select value={reciterId} onValueChange={setReciterId}>
                <SelectTrigger className="h-12 bg-background/50 border-accent/20"><SelectValue placeholder="اختر القارئ" /></SelectTrigger>
                <SelectContent>
                  {reciters.map((r) => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Aspect ratio */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-accent">
                <Film className="h-3.5 w-3.5" />
                مقاس الفيديو
              </Label>
              <Select value={ratio} onValueChange={setRatio}>
                <SelectTrigger className="h-12 bg-background/50 border-accent/20"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {aspectRatios.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Surah */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-accent">
              <BookOpen className="h-3.5 w-3.5" />
              السورة
            </Label>
            <Select value={surahId} onValueChange={(v) => { setSurahId(v); setAyahEnd(""); }}>
              <SelectTrigger className="h-12 bg-background/50 border-accent/20"><SelectValue placeholder="اختر السورة" /></SelectTrigger>
              <SelectContent>
                {surahs.map((s) => (
                  <SelectItem key={s.id} value={s.id.toString()}>
                    <span className="text-accent ml-2">{s.id}.</span> {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Ayah range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ayahStart" className="text-accent">من آية</Label>
              <Input
                id="ayahStart"
                type="number"
                min="1"
                max={selectedSurah?.ayahCount || 999}
                value={ayahStart}
                onChange={(e) => setAyahStart(e.target.value)}
                className="h-12 bg-background/50 border-accent/20 text-center font-display text-lg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ayahEnd" className="text-accent">إلى آية</Label>
              <Input
                id="ayahEnd"
                type="number"
                min={Number(ayahStart) || 1}
                max={selectedSurah?.ayahCount || 999}
                value={ayahEnd}
                onChange={(e) => setAyahEnd(e.target.value)}
                placeholder={selectedSurah ? `حتى ${selectedSurah.ayahCount}` : ""}
                className="h-12 bg-background/50 border-accent/20 text-center font-display text-lg"
              />
            </div>
          </div>

          <div className="pt-2">
            <Button variant="hero" size="lg" className="w-full" onClick={handleCreate}>
              <Sparkles className="h-4 w-4" />
              ابدأ التصميم في المحرر
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
