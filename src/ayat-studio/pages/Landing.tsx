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
  BookOpen,
  Moon,
  Wand2,
  Mic2,
  ScrollText,
  Sparkles,
} from "lucide-react";
import {
  ArabesqueMedallion,
  ArabyaMarkIcon,
  OrnamentDivider,
  StarOrnament,
} from "@/ayat-studio/components/IslamicDecor";

const features = [
  { icon: BookOpen, title: "اختيار السور والآيات", desc: "تصفح القرآن الكريم كاملاً واختر نطاق الآيات بسهولة" },
  { icon: Mic2, title: "نخبة من القراء", desc: "أشهر الأصوات: العفاسي، السديس، الشاطري، المعيقلي وغيرهم" },
  { icon: Palette, title: "تنسيق احترافي", desc: "تحكم دقيق بالخطوط والألوان وموضع النص بطابع فاخر" },
  { icon: Layers, title: "خلفيات ساحرة", desc: "ارفع صورك أو استخدم الخلفيات الجاهزة للمساجد والطبيعة" },
  { icon: Globe, title: "ترجمة وتفسير", desc: "إعدادات جاهزة في المحرر — التفعيل الكامل في التصدير قريبًا" },
  { icon: Download, title: "تصدير MP4 بجودة عالية", desc: "ريلز وقصص ومنصات التواصل — مجاني مع علامة عربية، وبدون علامة لخطة بلس" },
];

const steps = [
  {
    num: "١",
    title: "اختر التلاوة",
    desc: "حدد السورة والآيات والقارئ المفضل لديك",
  },
  {
    num: "٢",
    title: "صمّم اللوحة",
    desc: "اختر الخلفية والخط والألوان لتعكس روح الآية",
  },
  {
    num: "٣",
    title: "صدّر وانشر",
    desc: "حمّل الفيديو بصيغة MP4 جاهز للنشر مباشرة",
  },
];

const faqs = [
  { q: "هل المنصة مجانية بالكامل؟", a: "نعم بعد تسجيل الدخول يمكنك استخدام الاستوديو وتصدير MP4. الخطة المجانية تضيف علامة عربية شفافة أعلى يمين الفيديو؛ خطة بلس تصدّر بدون علامة." },
  { q: "ما المقاسات المدعومة؟", a: "ريلز وشورتس (٩:١٦)، منشور عمودي (٤:٥)، مربع (١:١)، يوتيوب أفقي (١٦:٩)، وغيرها." },
  { q: "هل يمكنني رفع خلفيات خاصة بي؟", a: "بالتأكيد، يمكنك رفع أي صورة من جهازك أو البحث في Pexels وPixabay أو استخدام رابط مدعوم." },
  { q: "هل الصوت ينزل مع الفيديو؟", a: "نعم — يتم دمج صوت التلاوة مع الفيديو في ملف MP4 واحد داخل المتصفح." },
  { q: "كم يستغرق التصدير؟", a: "عادة من ١–٣ دقائق حسب طول التلاوة والجودة. يُفضَّل Chrome أو Edge لترميز MP4." },
];

export default function Landing() {
  return (
    <div className="relative min-h-[70vh] overflow-hidden bg-transparent text-foreground">
      {/* Hero */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28">
        <div className="container relative mx-auto px-4 text-center">
          <div className="mx-auto mb-8 flex flex-col items-center gap-3 sm:gap-4">
            <Link href="/" className="group inline-flex flex-col items-center gap-3" title="الصفحة الرئيسية">
              <ArabyaMarkIcon
                size={56}
                className="transition group-hover:scale-105"
              />
              <div className="flex flex-col items-center gap-1.5">
                <span className="font-display text-xl font-bold text-foreground sm:text-2xl">
                  عربية ستوديو
                </span>
                <span className="text-[10px] tracking-[0.22em] text-accent/70">
                  ARABYA • STUDIO
                </span>
              </div>
            </Link>
          </div>
          <div className="mx-auto max-w-4xl animate-fade-in">
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-5 py-2 text-sm text-accent shadow-glow">
              <Moon className="h-4 w-4" />
              <span className="font-medium">استوديو متكامل لإنتاج المحتوى القرآني</span>
            </div>

            <h1 className="mb-8 font-display text-5xl font-bold leading-[1.15] tracking-tight md:text-7xl lg:text-8xl">
              <span className="block text-foreground/90">حوّل التلاوة إلى</span>
              <span className="block text-shimmer mt-2">تحفة بصرية</span>
            </h1>

            <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-muted-foreground md:text-xl">
              صمّم فيديوهات قرآنية وريلز إسلامية بطابع فاخر ودقة سينمائية —
              <br className="hidden md:inline" />
              بعد تسجيل الدخول، مباشرة من المتصفح بدون برامج مونتاج.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button variant="hero" asChild size="lg">
                <Link href={studioPath("/dashboard")}>
                  <Wand2 className="h-4 w-4" />
                  ادخل الاستوديو
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link href="/studio/ai">
                  <Sparkles className="h-4 w-4" />
                  فيديو ذكي
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <a href="#features">المميزات</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase / Mock preview */}
      <section className="container relative mx-auto px-4 -mt-4 pb-24">
        <div className="mx-auto max-w-5xl">
          <div className="glass-card rounded-3xl overflow-hidden shadow-deep border-gold animate-scale-in">
            {/* Window chrome */}
            <div className="flex items-center gap-2 border-b border-accent/10 bg-card/40 px-5 py-3">
              <div className="flex gap-1.5">
                <div className="h-2.5 w-2.5 rounded-full bg-destructive/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-accent/60" />
                <div className="h-2.5 w-2.5 rounded-full bg-primary/60" />
              </div>
              <span className="mr-4 font-display text-xs tracking-wider text-muted-foreground">عربية ستوديو — لوحة التحرير</span>
              <div className="ml-auto text-[10px] text-accent/60">● مباشر</div>
            </div>

            <div className="grid md:grid-cols-[280px_1fr]">
              {/* Side panel */}
              <div className="border-l border-accent/10 bg-background/40 p-5">
                <div className="mb-4 text-sm font-medium tracking-wider text-accent">إعدادات اللوحة</div>
                <div className="space-y-2.5">
                  {[
                    { label: "القارئ", value: "مشاري العفاسي" },
                    { label: "السورة", value: "الرحمن" },
                    { label: "الآيات", value: "١ - ١٣" },
                    { label: "الخلفية", value: "مسجد ليلي" },
                    { label: "المقاس", value: "9:16 ريلز" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg border border-border/40 bg-card/50 px-3 py-2.5 text-sm">
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
                  <div className="pattern-stars pointer-events-none absolute inset-0 opacity-50" aria-hidden />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-5 text-center">
                    <p
                      className="font-quran text-xl leading-loose text-white md:text-2xl"
                      style={{ textShadow: "0 2px 18px rgba(0,0,0,0.65)" }}
                    >
                      الرَّحْمَٰنُ
                      <br />
                      عَلَّمَ ٱلْقُرْءَانَ
                    </p>
                    <div className="mt-4 h-px w-12 bg-gradient-to-r from-transparent via-white/50 to-transparent" />
                    <p className="mt-2 text-xs tracking-widest text-white/80">
                      سورة الرحمن • ١-٢
                    </p>
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
            <p className="mx-auto max-w-xl text-base text-muted-foreground md:text-lg">
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
                  <h3 className="mb-2 font-display text-xl font-semibold text-foreground">{f.title}</h3>
                  <p className="text-base leading-relaxed text-muted-foreground">{f.desc}</p>
                  <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-transparent via-accent to-transparent transition-all duration-500 group-hover:w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <OrnamentDivider />

      {/* How it works — card steps, no brand logos */}
      <section className="relative py-24" aria-labelledby="studio-steps-heading">
        <div className="container relative mx-auto px-4">
          <div className="mb-16 text-center">
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.3em] text-accent">
              الخطوات
            </p>
            <h2
              id="studio-steps-heading"
              className="mb-4 font-display text-4xl font-bold text-foreground md:text-5xl"
            >
              ثلاث خطوات إلى{" "}
              <span className="text-gradient-gold">التحفة</span>
            </h2>
          </div>

          <div className="mx-auto grid max-w-5xl gap-5 md:grid-cols-3 md:gap-6">
            {steps.map((s) => (
              <article
                key={s.num}
                className="relative flex flex-col items-center rounded-3xl border border-border/80 bg-card px-6 py-10 text-center shadow-sm md:px-8 md:py-12"
              >
                <span className="mb-6 font-display text-5xl font-bold leading-none text-accent md:text-6xl">
                  {s.num}
                </span>
                <h3 className="mb-3 font-display text-2xl font-semibold text-foreground">
                  {s.title}
                </h3>
                <p className="max-w-[18rem] text-base leading-relaxed text-muted-foreground md:text-lg">
                  {s.desc}
                </p>
              </article>
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
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
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
      <section className="relative py-20">
        <div className="container relative mx-auto px-4">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-3xl gradient-night border-gold p-10 md:p-14 text-center shadow-deep">
            <div className="pattern-mihrab absolute inset-0 opacity-30" />
            <div className="relative">
              <ArabesqueMedallion size={48} className="mx-auto mb-5 text-accent animate-pulse-glow" />
              <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-4xl">
                ابدأ تحفتك <span className="text-gradient-gold">الآن</span>
              </h2>
              <p className="mb-8 text-muted-foreground">
                سجّل دخولك مجانًا وصدّر فيديوهاتك — مع علامة عربية في الخطة المجانية
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
    </div>
  );
}
