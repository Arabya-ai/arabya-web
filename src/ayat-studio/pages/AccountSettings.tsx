"use client";
import { Button } from "@/ayat-studio/components/ui/button";
import { Card, CardContent, CardHeader } from "@/ayat-studio/components/ui/card";
import { Input } from "@/ayat-studio/components/ui/input";
import { Label } from "@/ayat-studio/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ayat-studio/components/ui/select";
import { useEffect, useState } from "react";
import { useToast } from "@/ayat-studio/hooks/use-toast";
import { ArabesqueMedallion } from "@/ayat-studio/components/IslamicDecor";
import { User, Globe, Clock, AlertTriangle, KeyRound, Eye, EyeOff, ExternalLink } from "lucide-react";

const PREFS_KEY = "ayat_prefs";
export const PEXELS_KEY_STORAGE = "ayat_pexels_api_key";
export const PIXABAY_KEY_STORAGE = "ayat_pixabay_api_key";

interface Prefs {
  name: string;
  language: string;
  timezone: string;
}

const defaultPrefs: Prefs = { name: "", language: "ar", timezone: "Asia/Riyadh" };

export default function AccountSettings() {
  const [prefs, setPrefs] = useState<Prefs>(defaultPrefs);
  const [pexelsKey, setPexelsKey] = useState("");
  const [pixabayKey, setPixabayKey] = useState("");
  const [showPexelsKey, setShowPexelsKey] = useState(false);
  const [showPixabayKey, setShowPixabayKey] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(PREFS_KEY) || "null");
      if (stored) setPrefs({ ...defaultPrefs, ...stored });
    } catch {}
    setPexelsKey(localStorage.getItem(PEXELS_KEY_STORAGE) || "");
    setPixabayKey(localStorage.getItem(PIXABAY_KEY_STORAGE) || "");
  }, []);

  const handleSave = () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    const pexels = pexelsKey.trim();
    if (pexels) localStorage.setItem(PEXELS_KEY_STORAGE, pexels);
    else localStorage.removeItem(PEXELS_KEY_STORAGE);
    const pixabay = pixabayKey.trim();
    if (pixabay) localStorage.setItem(PIXABAY_KEY_STORAGE, pixabay);
    else localStorage.removeItem(PIXABAY_KEY_STORAGE);
    toast({ title: "تم الحفظ", description: "تم تحديث الإعدادات بنجاح" });
  };

  const handleClearData = () => {
    if (confirm("سيتم حذف جميع المشاريع والتصديرات. هل أنت متأكد؟")) {
      localStorage.removeItem("ayat_projects");
      localStorage.removeItem("ayat_exports");
      toast({ title: "تم مسح البيانات" });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="text-center">
        <ArabesqueMedallion size={48} className="mx-auto mb-3 text-accent" />
        <p className="mb-2 text-xs tracking-[0.3em] uppercase text-accent">التخصيص</p>
        <h1 className="font-display text-3xl font-bold text-foreground">
          <span className="text-gradient-gold">الإعدادات</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">إدارة تفضيلاتك الشخصية</p>
      </div>

      <Card className="border-accent/15 bg-card/50 backdrop-blur-sm">
        <CardHeader className="border-b border-border/30 pb-4">
          <h2 className="font-display flex items-center gap-2 text-foreground">
            <User className="h-4 w-4 text-accent" />
            المعلومات الشخصية
          </h2>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label className="text-accent">الاسم (اختياري)</Label>
            <Input
              value={prefs.name}
              onChange={(e) => setPrefs({ ...prefs, name: e.target.value })}
              placeholder="اسمك الكريم"
              className="h-11 bg-background/50 border-accent/20"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-accent/15 bg-card/50 backdrop-blur-sm">
        <CardHeader className="border-b border-border/30 pb-4">
          <h2 className="font-display flex items-center gap-2 text-foreground">
            <Globe className="h-4 w-4 text-accent" />
            التفضيلات
          </h2>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          <div className="space-y-2">
            <Label className="text-accent">اللغة</Label>
            <Select value={prefs.language} onValueChange={(v) => setPrefs({ ...prefs, language: v })}>
              <SelectTrigger className="h-11 bg-background/50 border-accent/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ar">العربية</SelectItem>
                <SelectItem value="en">English</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-accent">
              <Clock className="h-3.5 w-3.5" />
              المنطقة الزمنية
            </Label>
            <Select value={prefs.timezone} onValueChange={(v) => setPrefs({ ...prefs, timezone: v })}>
              <SelectTrigger className="h-11 bg-background/50 border-accent/20"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Asia/Riyadh">الرياض (UTC+3)</SelectItem>
                <SelectItem value="Asia/Dubai">دبي (UTC+4)</SelectItem>
                <SelectItem value="Africa/Cairo">القاهرة (UTC+2)</SelectItem>
                <SelectItem value="Europe/Istanbul">إسطنبول (UTC+3)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-accent/15 bg-card/50 backdrop-blur-sm">
        <CardHeader className="border-b border-border/30 pb-4">
          <h2 className="font-display flex items-center gap-2 text-foreground">
            <KeyRound className="h-4 w-4 text-accent" />
            مفاتيح API
          </h2>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          <div className="space-y-2">
            <Label className="text-accent">مفتاح Pexels API</Label>
            <div className="relative">
              <Input
                type={showPexelsKey ? "text" : "password"}
                value={pexelsKey}
                onChange={(e) => setPexelsKey(e.target.value)}
                placeholder="563492ad6f917000010000..."
                className="h-11 bg-background/50 border-accent/20 pl-10"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPexelsKey((s) => !s)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-accent transition"
                aria-label={showPexelsKey ? "إخفاء" : "إظهار"}
              >
                {showPexelsKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              يُستخدم عبر خادم عربية (`/api/studio/pexels`). يمكن ضبط{" "}
              <code className="text-accent">PEXELS_API_KEY</code> على Vercel بدل إدخاله هنا.
            </p>
            <a
              href="https://www.pexels.com/api/new/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              احصل على مفتاح مجاني من Pexels
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>

          <div className="space-y-2 border-t border-border/30 pt-4">
            <Label className="text-accent">مفتاح Pixabay API</Label>
            <div className="relative">
              <Input
                type={showPixabayKey ? "text" : "password"}
                value={pixabayKey}
                onChange={(e) => setPixabayKey(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="h-11 bg-background/50 border-accent/20 pl-10"
                dir="ltr"
              />
              <button
                type="button"
                onClick={() => setShowPixabayKey((s) => !s)}
                className="absolute left-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:text-accent transition"
                aria-label={showPixabayKey ? "إخفاء" : "إظهار"}
              >
                {showPixabayKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              منفصل عن Pexels تمامًا (`/api/studio/pixabay`). يمكن ضبط{" "}
              <code className="text-accent">PIXABAY_API_KEY</code> على Vercel بدل إدخاله هنا.
            </p>
            <a
              href="https://pixabay.com/service/about/api/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              احصل على مفتاح مجاني من Pixabay
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </CardContent>
      </Card>

      <Button variant="hero" size="lg" onClick={handleSave} className="w-full">
        حفظ التغييرات
      </Button>

      <Card className="border-destructive/30 bg-destructive/5 backdrop-blur-sm">
        <CardHeader className="border-b border-destructive/20 pb-4">
          <h2 className="font-display flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            منطقة الخطر
          </h2>
        </CardHeader>
        <CardContent className="p-6">
          <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
            احذف جميع مشاريعك وسجل التصدير من هذا المتصفح. لا يمكن التراجع عن هذا الإجراء.
          </p>
          <Button
            variant="outline"
            onClick={handleClearData}
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
          >
            مسح جميع البيانات
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
