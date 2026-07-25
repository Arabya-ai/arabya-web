"use client";
import { Card, CardContent } from "@/ayat-studio/components/ui/card";
import { Button } from "@/ayat-studio/components/ui/button";
import { Link } from "@/i18n/navigation";
import { studioPath } from "@/ayat-studio/lib/studio-paths";
import { FolderOpen, Plus, Video, Download, Clock, Sparkles, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { getProjects, getExports, type StoredProject, type StoredExport } from "@/ayat-studio/lib/projects-store";
import { reciters, surahs } from "@/ayat-studio/lib/quran-data";
import { ArabesqueMedallion, OrnamentDivider } from "@/ayat-studio/components/IslamicDecor";

export default function Dashboard() {
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const [exports, setExports] = useState<StoredExport[]>([]);

  useEffect(() => {
    setProjects(getProjects());
    setExports(getExports());
  }, []);

  const completed = exports.filter((e) => e.status === "مكتمل").length;
  const processing = exports.filter((e) => e.status === "جاري المعالجة" || e.status === "قيد الانتظار").length;

  const stats = [
    { label: "المشاريع", value: projects.length, icon: FolderOpen, accent: "text-accent" },
    { label: "فيديوهات مكتملة", value: completed, icon: Video, accent: "text-primary-glow" },
    { label: "قيد المعالجة", value: processing, icon: Clock, accent: "text-accent-glow" },
    { label: "إجمالي التصديرات", value: exports.length, icon: Download, accent: "text-accent" },
  ];

  const recent = projects.slice(0, 3);

  const statusBadge = (s: string) => {
    if (s === "مكتمل") return "bg-primary/15 text-primary-glow border border-primary/30";
    if (s === "جاري المعالجة") return "bg-accent/15 text-accent border border-accent/30";
    return "bg-muted/50 text-muted-foreground border border-border";
  };

  return (
    <div className="space-y-10">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-3xl glass-panel border-gold p-8 md:p-10">
        <div className="pattern-mihrab absolute inset-0 opacity-30" />
        <div className="aurora-orb h-64 w-64 -top-20 -left-20" style={{ background: "hsl(41 75% 50% / 0.3)" }} />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-3 py-1 text-xs text-accent">
              <Sparkles className="h-3 w-3" />
              <span>أهلاً بك في الاستوديو</span>
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
              مرحباً بك في <span className="text-gradient-gold">آيات ستوديو</span>
            </h1>
            <p className="mt-2 text-muted-foreground">
              ابدأ تحفتك القرآنية القادمة — كل الأدوات بين يديك
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ArabesqueMedallion size={64} className="hidden md:block text-accent animate-pulse-glow" />
            <Button variant="hero" size="lg" asChild>
              <Link href={studioPath("/projects/new")}>
                <Plus className="h-4 w-4" />
                مشروع جديد
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <Card
            key={s.label}
            className="group relative overflow-hidden border-accent/15 bg-card/50 backdrop-blur-sm hover-lift"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="pattern-stars absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardContent className="relative flex items-center gap-4 p-5">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/10 to-transparent">
                <s.icon className={`h-5 w-5 ${s.accent}`} />
              </div>
              <div>
                <div className="font-display text-3xl font-bold text-foreground">{s.value}</div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent projects */}
      <div>
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">المشاريع الأخيرة</h2>
            <p className="text-xs text-muted-foreground">آخر ما عملت عليه</p>
          </div>
          <Button variant="ghost" size="sm" asChild className="text-accent">
            <Link href={studioPath("/projects")}>
              عرض الكل
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {recent.length === 0 ? (
          <Card className="relative overflow-hidden border-dashed border-accent/30 bg-card/30">
            <div className="pattern-mihrab absolute inset-0 opacity-20" />
            <CardContent className="relative py-16 text-center">
              <ArabesqueMedallion size={56} className="mx-auto mb-4 text-accent/50" />
              <p className="mb-1 font-display text-lg text-foreground">لم تبدأ بعد</p>
              <p className="mb-5 text-sm text-muted-foreground">أنشئ أول مشروع قرآني الآن</p>
              <Button variant="hero" asChild>
                <Link href={studioPath("/projects/new")}>
                  <Plus className="h-4 w-4" />
                  أنشئ أول مشروع
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((p) => {
              const surah = surahs.find((s) => s.id === p.surahId);
              const reciter = reciters.find((r) => r.id === p.reciterId);
              return (
                <Link key={p.id} href={studioPath(`/editor/${p.id}`)} className="group">
                  <Card className="relative overflow-hidden border-accent/15 bg-card/50 backdrop-blur-sm hover-lift cursor-pointer h-full">
                    <div className="relative h-28 overflow-hidden"
                      style={{ background: "linear-gradient(135deg, hsl(178 50% 18%) 0%, hsl(200 40% 8%) 100%)" }}>
                      <div className="pattern-stars absolute inset-0 opacity-50" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <ArabesqueMedallion size={56} className="text-accent/60 group-hover:rotate-45 transition-transform duration-700" />
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <div className="mb-2 flex items-start justify-between gap-2">
                        <h3 className="font-display font-semibold text-foreground truncate flex-1">{p.title}</h3>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${statusBadge(p.status)}`}>
                          {p.status}
                        </span>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center justify-between">
                          <span className="text-accent/70">السورة</span>
                          <span>{surah?.name}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-accent/70">القارئ</span>
                          <span>{reciter?.name}</span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-border/40">
                          <span className="text-accent/70">التاريخ</span>
                          <span>{new Date(p.createdAt).toLocaleDateString("ar-EG")}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <OrnamentDivider />
    </div>
  );
}
