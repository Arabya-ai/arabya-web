"use client";
import { Card, CardContent } from "@/ayat-studio/components/ui/card";
import { Button } from "@/ayat-studio/components/ui/button";
import { Link, useRouter } from "@/i18n/navigation";
import { studioPath } from "@/ayat-studio/lib/studio-paths";
import { Plus, Edit, Copy, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getProjects, deleteProject, duplicateProject, type StoredProject } from "@/ayat-studio/lib/projects-store";
import { reciters, surahs } from "@/ayat-studio/lib/quran-data";
import { useToast } from "@/ayat-studio/hooks/use-toast";
import { ArabesqueMedallion } from "@/ayat-studio/components/IslamicDecor";

const statusBadge = (s: string) => {
  if (s === "مكتمل") return "bg-primary/15 text-primary-glow border border-primary/30";
  if (s === "جاري المعالجة") return "bg-accent/15 text-accent border border-accent/30";
  if (s === "فشل") return "bg-destructive/15 text-destructive border border-destructive/30";
  return "bg-muted/50 text-muted-foreground border border-border";
};

export default function Projects() {
  const [projects, setProjects] = useState<StoredProject[]>([]);
  const router = useRouter();
  const { toast } = useToast();

  const refresh = () => setProjects(getProjects());
  useEffect(() => { refresh(); }, []);

  const handleDelete = (id: string) => {
    deleteProject(id);
    refresh();
    toast({ title: "تم الحذف", description: "تم حذف المشروع" });
  };

  const handleDuplicate = (id: string) => {
    const copy = duplicateProject(id);
    if (copy) {
      refresh();
      toast({ title: "تم النسخ", description: "تم إنشاء نسخة من المشروع" });
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs tracking-[0.3em] uppercase text-accent">المعرض</p>
          <h1 className="font-display text-3xl font-bold text-foreground">
            مشاريعي <span className="text-gradient-gold">القرآنية</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{projects.length} مشروع{projects.length !== 1 ? "اً" : ""}</p>
        </div>
        <Button variant="hero" asChild>
          <Link href={studioPath("/projects/new")}>
            <Plus className="h-4 w-4" />
            مشروع جديد
          </Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="relative overflow-hidden border-dashed border-accent/30 bg-card/30">
          <div className="pattern-mihrab absolute inset-0 opacity-20" />
          <CardContent className="relative py-20 text-center">
            <ArabesqueMedallion size={72} className="mx-auto mb-5 text-accent/50" />
            <p className="mb-1 font-display text-xl text-foreground">معرضك في انتظار أول لوحة</p>
            <p className="mb-5 text-sm text-muted-foreground">ابدأ بإنشاء أول فيديو قرآني لك</p>
            <Button variant="hero" asChild>
              <Link href={studioPath("/projects/new")}>
                <Plus className="h-4 w-4" />
                أنشئ أول مشروع
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const surah = surahs.find((s) => s.id === p.surahId);
            const reciter = reciters.find((r) => r.id === p.reciterId);
            return (
              <Card key={p.id} className="group relative overflow-hidden border-accent/15 bg-card/50 backdrop-blur-sm hover-lift">
                <CardContent className="p-0">
                  <div
                    className="relative flex h-40 items-center justify-center cursor-pointer overflow-hidden"
                    style={{ background: "linear-gradient(135deg, hsl(178 50% 18%) 0%, hsl(200 40% 8%) 100%)" }}
                    onClick={() => router.push(studioPath(`/editor/${p.id}`))}
                  >
                    <div className="pattern-stars pointer-events-none absolute inset-0 opacity-50" aria-hidden />
                    <ArabesqueMedallion size={70} className="relative text-accent/70" />
                    <div className="absolute top-2 right-2 text-[10px] tracking-widest text-accent/60 px-2 py-0.5 rounded-full bg-background/40 border border-accent/20">
                      {p.ratio}
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <h3 className="font-display font-semibold text-foreground truncate flex-1">{p.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${statusBadge(p.status)}`}>{p.status}</span>
                    </div>
                    <div className="mb-4 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between">
                        <span className="text-accent/70">السورة</span>
                        <span>{surah?.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-accent/70">القارئ</span>
                        <span className="truncate max-w-[140px]">{reciter?.name}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-border/40">
                        <span className="text-accent/70">التاريخ</span>
                        <span>{new Date(p.createdAt).toLocaleDateString("ar-EG")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 border-t border-border/40 pt-3">
                      <Button variant="ghost" size="sm" className="flex-1 text-accent" asChild>
                        <Link href={studioPath(`/editor/${p.id}`)}>
                          <Edit className="h-3.5 w-3.5" />
                          تحرير
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDuplicate(p.id)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
