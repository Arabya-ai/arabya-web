"use client";
import { Button } from "@/ayat-studio/components/ui/button";
import { Card } from "@/ayat-studio/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ayat-studio/components/ui/table";
import { Download, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getExports, deleteExport, getExportVideoUrl, type StoredExport } from "@/ayat-studio/lib/projects-store";
import { useToast } from "@/ayat-studio/hooks/use-toast";
import { ArabesqueMedallion } from "@/ayat-studio/components/IslamicDecor";

const statusBadge = (s: string) => {
  if (s === "مكتمل") return "bg-primary/15 text-primary-glow border border-primary/30";
  if (s === "جاري المعالجة") return "bg-accent/15 text-accent border border-accent/30";
  if (s === "قيد الانتظار") return "bg-muted/50 text-muted-foreground border border-border";
  return "bg-destructive/15 text-destructive border border-destructive/30";
};

export default function Exports() {
  const [exports, setExports] = useState<StoredExport[]>([]);
  const { toast } = useToast();

  const refresh = () => setExports(getExports());
  useEffect(() => { refresh(); }, []);

  const handleDownload = (exp: StoredExport) => {
    const url = getExportVideoUrl(exp.id);
    if (!url) {
      toast({
        title: "الفيديو غير متاح",
        description: "ملفات الجلسة السابقة لا تبقى بعد إعادة التحميل. أعد التصدير.",
        variant: "destructive",
      });
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = `${exp.projectTitle}.mp4`;
    a.click();
  };

  const handleDelete = (id: string) => {
    deleteExport(id);
    refresh();
    toast({ title: "تم الحذف" });
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="mb-2 text-xs tracking-[0.3em] uppercase text-accent">الأرشيف</p>
        <h1 className="font-display text-3xl font-bold text-foreground">
          سجل <span className="text-gradient-gold">التصدير</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">جميع عمليات التصدير السابقة في هذه الجلسة</p>
      </div>

      {exports.length === 0 ? (
        <Card className="relative overflow-hidden border-dashed border-accent/30 bg-card/30">
          <div className="pattern-mihrab absolute inset-0 opacity-20" />
          <div className="relative py-20 text-center">
            <ArabesqueMedallion size={72} className="mx-auto mb-5 text-accent/50" />
            <p className="font-display text-xl text-foreground">لا يوجد سجل بعد</p>
            <p className="mt-1 text-sm text-muted-foreground">صدّر أول فيديو ليظهر هنا</p>
          </div>
        </Card>
      ) : (
        <Card className="border-accent/15 bg-card/50 backdrop-blur-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-accent/15 hover:bg-transparent">
                  <TableHead className="text-accent/80">المشروع</TableHead>
                  <TableHead className="text-accent/80">المقاس</TableHead>
                  <TableHead className="text-accent/80">الجودة</TableHead>
                  <TableHead className="text-accent/80">الحالة</TableHead>
                  <TableHead className="text-accent/80">التاريخ</TableHead>
                  <TableHead className="text-accent/80">الحجم</TableHead>
                  <TableHead className="text-accent/80">إجراء</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.map((exp) => (
                  <TableRow key={exp.id} className="border-border/30 hover:bg-accent/5">
                    <TableCell className="font-medium text-foreground">{exp.projectTitle}</TableCell>
                    <TableCell className="text-muted-foreground">{exp.ratio}</TableCell>
                    <TableCell className="text-muted-foreground">{exp.quality}</TableCell>
                    <TableCell>
                      <span className={`text-[10px] px-2 py-1 rounded-full ${statusBadge(exp.status)}`}>{exp.status}</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(exp.date).toLocaleString("ar-EG")}</TableCell>
                    <TableCell className="text-muted-foreground">{exp.size}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {exp.status === "مكتمل" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-accent" onClick={() => handleDownload(exp)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDelete(exp.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </div>
  );
}
