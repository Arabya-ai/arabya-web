"use client";
import { Button } from "@/ayat-studio/components/ui/button";
import { Card, CardContent } from "@/ayat-studio/components/ui/card";
import { Link } from "@/i18n/navigation";
import { studioPath } from "@/ayat-studio/lib/studio-paths";
import {
  Layers,
  Download,
  Palette,
  Music,
  Globe,
  ChevronDown,
  Play,
  BookOpen,
  Moon,
  Wand2,
  Mic2,
  ScrollText,
} from "lucide-react";
import {
  IslamicBackdrop,
  ArabesqueMedallion,
  OrnamentDivider,
  StarOrnament,
} from "@/ayat-studio/components/IslamicDecor";

const features = [
  { icon: BookOpen, title: "اختيار السور والآيات", desc: "تصفح القرآن الكريم كاملاً واختر نطاق الآيات بسهولة" },
  { icon: Mic2, title: "نخبة من القراء", desc: "أشهر الأصوات: العفاسي، السديس، الشاطري، المعيقلي وغيرهم" },
  { icon: Palette, title: "تنسيق احترافي", desc: "تحكم دقيق بالخطوط والألوان وموضع النص بطابع فاخر" },
  { icon: Layers, title: "خلفيات ساحرة", desc: "ارفع صورك أو استخدم الخلفيات الجاهزة للمساجد والطبيعة" },
  { icon: Globe, title: "ترجمة وتفسير", desc: "أضف الترجمة الإنجليزية أو التفسير الميسر مع الآيات" },
  { icon: Download, title: "تصدير MP4 بجودة 4K", desc: "ريلز عمودي، يوتيوب أفقي، أو مربع — جودة سينمائية" },
];

const steps = [
  { num: "١", title: "اختر التلاوة", desc: "حدد السورة والآيات والقارئ المفضل لديك" },
  { num: "٢", title: "صمّم اللوحة", desc: "اختر الخلفية والخط والألوان لتعكس روح الآية" },
  { num: "٣", title: "صدّر وانشر", desc: "حمّل الفيديو بصيغة MP4 جاهز للنشر مباشرة" },
];

const faqs = [
  { q: "هل المنصة مجانية بالكامل؟", a: "يمكنك استكشاف الاستوديو بعد تسجيل الدخول. تصدير MP4 متاح لخطة عربية بلس — انظر صفحة الأسعار." },
  { q: "ما المقاسات المدعومة؟", a: "ندعم الريلز (٩:١٦) للتيك توك وإنستجرام، يوتيوب الأفقي (١٦:٩)، والمربع (١:١) للمنشورات." },
  { q: "هل يمكنني رفع خلفيات خاصة بي؟", a: "بالتأكيد، يمكنك رفع أي صورة من جهازك أو استخدام رابط مباشر لاستخدامه كخلفية." },
  { q: "هل الصوت ينزل مع الفيديو؟", a: "نعم — يتم تحميل صوت التلاوة مباشرة من مصادر معتمدة ودمجه مع الفيديو في ملف MP4 واحد." },
  { q: "كم يستغرق التصدير؟", a: "عادة من ١-٣ دقائق حسب طول التلاوة والجودة. يتم التصدير في Chrome أو Edge." },
];

export default function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <IslamicBackdrop />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-accent/10 bg-background/70 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href={studioPath("/")} className="flex items-center gap-3 group">
            <ArabesqueMedallion size={36} className="text-accent transition-transform group-hover:rotate-45 duration-700" />
            <div className="flex flex-col leading-none">
              <span className="font-display text-lg font-bold text-foreground">آيات ستوديو</span>
              <span className="text-[10px] text-accent/70 tracking-widest">AYAT • STUDIO</span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <a href="#features">المميزات</a>
            </Button>
            <Button variant="ghost" asChild className="hidden sm:inline-flex">
              <a href="#faq">الأسئلة</a>
            </Button>
            <Button variant="hero" asChild>
              <Link href={studioPath("/dashboard")}>
                <Wand2 className="h-4 w-4" />
                ادخل الاستوديو
              </Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-20 pb-28 md:pt-32 md:pb-40">
        <div className="container relative mx-auto px-4 text-center">
          <div className="mx-auto max-w-4xl animate-fade-in">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-5 py-2 text-sm text-accent shadow-glow">
              <Moon className="h-4 w-4" />
              <span className="font-medium">استوديو متكامل لإنتاج المحتوى القرآني</span>
              <StarOrnament className="h-3 w-3" />
            </div>

            <h1 className="mb-8 font-display text-5xl font-bold leading-[1.15] tracking-tight md:text-7xl lg:text-8xl">
              <span className="block text-foreground/90">حوّل التلاوة إلى</span>
              <span className="block text-shimmer mt-2">تحفة بصرية</span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              صمّم فيديوهات قرآنية وريلز إسلامية بطابع فاخر ودقة سينمائية —
              <br className="hidden md:inline" />
              بدون برامج مونتاج، بدون حساب، وبدون أي تكلفة.
            </p>

            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button variant="hero" size="lg" className="min-w-[200px]" asChild>
                <Link href={studioPath("/projects/new")}>
                  <Play className="h-5 w-5" />
                  ابدأ الإبداع الآن
                </Link>
              </Button>
              <Button variant="royal" size="lg" className="min-w-[200px]" asChild>
                <a href="#features">
                  اكتشف المميزات
                  <ChevronDown className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="mt-10 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                مجاني بالكامل
              </div>
              <span className="text-accent/30">•</span>
              <div>بدون تسجيل</div>
              <span className="text-accent/30">•</span>
              <div className="hidden sm:block">تصدير MP4 + صوت</div>
            </div>
          </div>
        </div>

        {/* Decorative arches */}
        <ArabesqueMedallion size={160} className="absolute -left-20 top-32 text-accent/10 animate-float hidden lg:block" />
        <ArabesqueMedallion size={120} className="absolute -right-12 bottom-20 text-accent/10 animate-float hidden lg:block" />
      </section>

      {/* Showcase / Mock preview */}
      <section className="container relative mx-auto px-4 -mt-12 pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="glass-card rounded-3xl overflow-hidden shadow-deep border-gold animate-scale-in">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-accent/10 bg-card/40 px-5 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-accent/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
              </div>
              <span className="mr-4 font-display text-xs tracking-wider text-muted-foreground">آيات ستوديو — لوحة التحرير</span>
              <div className="ml-auto text-[10px] text-accent/60">● مباشر</div>
            </div>

            <div className="grid md:grid-cols-[280px_1fr]">
              {/* Side panel */}
              <div className="border-l border-accent/10 bg-background/40 p-5">
                <div className="mb-4 text-xs font-medium uppercase tracking-wider text-accent/70">إعدادات اللوحة</div>
                <div className="space-y-2.5">
                  {[
                    { label: "القارئ", value: "مشاري العفاسي" },
                    { label: "السورة", value: "الرحمن" },
                    { label: "الآيات", value: "١ - ١٣" },
                    { label: "الخلفية", value: "مسجد ليلي" },
                    { label: "المقاس", value: "9:16 ريلز" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/50 px-3 py-2 text-xs">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
                <Button variant="hero" size="sm" className="mt-5 w-full">
                  <Download className="h-3.5 w-3.5" />
                  تصدير MP4
                </Button>
              </div>

              {/* Preview */}
              <div className="relative flex items-center justify-center p-10 md:p-14"
                style={{ background: "radial-gradient(circle at 50% 0%, hsl(178 50% 18% / 0.4), transparent 70%)" }}>
                <div className="pattern-mihrab absolute inset-0 opacity-30" />
                <div className="relative aspect-[9/16] w-56 rounded-2xl overflow-hidden border border-accent/30 shadow-deep"
                  style={{
                    background: "linear-gradient(180deg, hsl(200 50% 8%) 0%, hsl(178 50% 12%) 50%, hsl(200 50% 6%) 100%)",
                  }}>
                  <div className="pattern-stars absolute inset-0 opacity-50" />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
                    <ArabesqueMedallion size={40} className="mb-4 text-accent animate-pulse-glow" />
                    <p className="font-quran text-xl leading-loose text-foreground" style={{ textShadow: "0 0 20px rgba(200,169,81,0.5)" }}>
                      الرَّحْمَٰنُ
                      <br />
                      عَلَّمَ ٱلْقُرْءَانَ
                    </p>
                    <div className="mt-4 h-px w-12 bg-gradient-to-r from-transparent via-accent to-transparent" />
                    <p className="mt-2 text-[10px] tracking-widest text-accent/80">سورة الرحمن • ١-٢</p>
                  </div>
                  {/* Bottom progress bar */}
                  <div className="absolute bottom-3 left-3 right-3">
                    <div className="h-0.5 bg-foreground/20 rounded-full overflow-hidden">
                      <div className="h-full w-1/3 bg-accent" />
                    </div>
                  </div>
                </div>

                {/* Floating decorative icons */}
                <div className="absolute top-8 left-8 hidden md:flex h-10 w-10 items-center justify-center rounded-full glass-panel animate-float" style={{ animationDelay: "-2s" }}>
                  <Music className="h-4 w-4 text-accent" />
                </div>
                <div className="absolute bottom-8 right-8 hidden md:flex h-10 w-10 items-center justify-center rounded-full glass-panel animate-float" style={{ animationDelay: "-4s" }}>
                  <ScrollText className="h-4 w-4 text-accent" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <OrnamentDivider />

      {/* Features */}
      <section id="features" className="relative py-24">
        <div className="container relative mx-auto px-4">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-accent">المميزات</p>
            <h2 className="mb-4 font-display text-4xl font-bold text-foreground md:text-5xl">
              أدوات صُنعت <span className="text-gradient-gold">بإتقان</span>
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              كل ما تحتاجه لإنتاج فيديو قرآني فاخر — في مكان واحد، وبتجربة سلسة
            </p>
          </div>

          <div className="mx-auto grid max-w-6xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <Card
                key={f.title}
                className="group relative overflow-hidden border-accent/15 bg-card/50 backdrop-blur-sm hover-lift"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pattern-stars" />
                <CardContent className="relative p-7">
                  <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-accent/30 bg-gradient-to-br from-accent/15 to-transparent shadow-glow">
                    <f.icon className="h-6 w-6 text-accent" />
                  </div>
                  <h3 className="mb-2 font-display text-lg font-semibold text-foreground">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
                  <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-transparent via-accent to-transparent transition-all duration-500 group-hover:w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <OrnamentDivider />

      {/* How it works */}
      <section className="relative py-24">
        <div className="container relative mx-auto px-4">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-accent">الخطوات</p>
            <h2 className="mb-4 font-display text-4xl font-bold text-foreground md:text-5xl">
              ثلاث خطوات إلى <span className="text-gradient-gold">التحفة</span>
            </h2>
          </div>

          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3 relative">
            {/* connecting line */}
            <div className="hidden md:block absolute top-10 right-[16%] left-[16%] h-px bg-gradient-to-l from-transparent via-accent/30 to-transparent" />
            {steps.map((s, i) => (
              <div key={i} className="relative text-center">
                <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
                  <ArabesqueMedallion size={80} className="absolute inset-0 text-accent/40" />
                  <span className="relative font-display text-3xl font-bold text-gradient-gold">{s.num}</span>
                </div>
                <h3 className="mb-2 font-display text-xl font-semibold text-foreground">{s.title}</h3>
                <p className="mx-auto max-w-xs text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quote / Verse */}
      <section className="relative py-24">
        <div className="container relative mx-auto px-4">
          <div className="mx-auto max-w-3xl text-center glass-panel rounded-3xl p-12 md:p-16 border-gold relative overflow-hidden">
            <div className="pattern-mihrab absolute inset-0 opacity-40" />
            <ArabesqueMedallion size={56} className="relative mx-auto mb-6 text-accent" />
            <p className="relative font-quran text-3xl leading-loose text-foreground md:text-4xl" style={{ textShadow: "0 0 30px rgba(200,169,81,0.3)" }}>
              ﴿ وَنُنَزِّلُ مِنَ ٱلْقُرْءَانِ مَا هُوَ شِفَآءٌ وَرَحْمَةٌ لِّلْمُؤْمِنِينَ ﴾
            </p>
            <p className="relative mt-6 text-sm tracking-widest text-accent">سورة الإسراء — آية ٨٢</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-24">
        <div className="container relative mx-auto px-4">
          <div className="mb-12 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-accent">الأسئلة الشائعة</p>
            <h2 className="mb-4 font-display text-4xl font-bold text-foreground md:text-5xl">
              <span className="text-gradient-gold">إجابات</span> لما يهمّك
            </h2>
          </div>
          <div className="mx-auto max-w-2xl space-y-3">
            {faqs.map((faq, i) => (
              <details key={i} className="group rounded-2xl border border-accent/15 bg-card/40 backdrop-blur-sm transition-all hover:border-accent/30 open:border-accent/40 open:shadow-glow">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 font-medium text-foreground">
                  <span className="flex items-center gap-3">
                    <StarOrnament className="h-3 w-3 text-accent" />
                    {faq.q}
                  </span>
                  <ChevronDown className="h-4 w-4 text-accent transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-5 pr-12 text-sm leading-relaxed text-muted-foreground">{faq.a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24">
        <div className="container relative mx-auto px-4">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl gradient-night border-gold p-12 md:p-16 text-center shadow-deep">
            <div className="pattern-mihrab absolute inset-0 opacity-30" />
            <div className="aurora-orb h-72 w-72 top-0 right-0" style={{ background: "hsl(41 75% 50% / 0.4)" }} />
            <div className="relative">
              <ArabesqueMedallion size={56} className="mx-auto mb-5 text-accent animate-pulse-glow" />
              <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-5xl">
                ابدأ تحفتك <span className="text-gradient-gold">الآن</span>
              </h2>
              <p className="mb-8 text-muted-foreground">
                مجاني تماماً، بدون تسجيل، ويعمل مباشرة في متصفحك
              </p>
              <Button variant="hero" size="lg" className="min-w-[220px]" asChild>
                <Link href={studioPath("/projects/new")}>
                  <Wand2 className="h-5 w-5" />
                  أنشئ أول فيديو
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-accent/15 py-12">
        <div className="container relative mx-auto px-4">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-3">
              <ArabesqueMedallion size={32} className="text-accent" />
              <div>
                <div className="font-display font-bold text-foreground">آيات ستوديو</div>
                <div className="text-[10px] tracking-widest text-accent/70">AYAT • STUDIO</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} آيات ستوديو — صُنع بحب لخدمة كتاب الله
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <a href="#features" className="hover:text-accent transition-colors">المميزات</a>
              <a href="#faq" className="hover:text-accent transition-colors">الأسئلة</a>
              <Link href={studioPath("/dashboard")} className="hover:text-accent transition-colors">الاستوديو</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
