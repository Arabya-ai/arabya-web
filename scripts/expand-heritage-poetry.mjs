#!/usr/bin/env node
/**
 * Expand heritage poetry samples (owner-requested deeper samples).
 * Writes works matching HeritageWork schema (slug + passages).
 * Does not download multi-GB corpora into Git.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const worksDir = join(root, "data", "heritage", "works");
const indexPath = join(root, "data", "heritage", "index.json");

mkdirSync(worksDir, { recursive: true });

/** Classical couplets (PD / traditional attributions for education). */
const EXTRA = [
  {
    poetAr: "المتنبي",
    poetEn: "al-Mutanabbi",
    meter: "الطويل",
    titleAr: "على قدر أهل العزم",
    titleEn: "On the measure of resolve",
    textAr: "على قدر أهل العزم تأتي العزائم · وتأتي على قدر الكرام المكارم",
  },
  {
    poetAr: "المتنبي",
    poetEn: "al-Mutanabbi",
    meter: "البسيط",
    titleAr: "الخيل والليل",
    titleEn: "Horses and night",
    textAr: "الخيل والليل والبيداء تعرفني · والسيف والرمح والقرطاس والقلم",
  },
  {
    poetAr: "أبو تمام",
    poetEn: "Abu Tammam",
    meter: "الكامل",
    titleAr: "السيف أصدق",
    titleEn: "The sword is truer",
    textAr: "السيف أصدق إنباءً من الكتب · في حده الحد بين الجد واللعب",
  },
  {
    poetAr: "البحتري",
    poetEn: "al-Buhturi",
    meter: "الخفيف",
    titleAr: "الربيع الطلق",
    titleEn: "Open spring",
    textAr: "أتاك الربيع الطلق يختال ضاحكاً · من الحسن حتى كاد أن يتكلما",
  },
  {
    poetAr: "الشافعي",
    poetEn: "al-Shafiʿi",
    meter: "الطويل",
    titleAr: "ما في المقام",
    titleEn: "No rest in staying",
    textAr: "ما في المقام لذي عقل وذي أدب · من راحة فدع الأوطان واغترب",
  },
  {
    poetAr: "الشافعي",
    poetEn: "al-Shafiʿi",
    meter: "البسيط",
    titleAr: "سافر تجد عوضاً",
    titleEn: "Travel and find replacement",
    textAr: "سافر تجد عوضاً عمن تفارقه · وانصب فإن لذيذ العيش في النصب",
  },
  {
    poetAr: "ابن الفارض",
    poetEn: "Ibn al-Farid",
    meter: "الطويل",
    titleAr: "سقتني حميّا الحب",
    titleEn: "Love’s wine",
    textAr: "سقتني حميّا الحب راحة مقلتي · وكأسي محيّا من عن الحسن جلت",
  },
  {
    poetAr: "ابن الرومي",
    poetEn: "Ibn al-Rumi",
    meter: "الكامل",
    titleAr: "أحسن إلى الناس",
    titleEn: "Do good to people",
    textAr: "أحسن إلى الناس تستعبد قلوبهم · فطالما استعبد الإنسان إحسان",
  },
  {
    poetAr: "صالح بن عبد القدوس",
    poetEn: "Salih b. Abd al-Quddus",
    meter: "البسيط",
    titleAr: "المرء يجمع",
    titleEn: "Man gathers",
    textAr: "المرء يجمع والزمان يفرق · ويظل يرقع والتفرق يخرق",
  },
  {
    poetAr: "أبو العتاهية",
    poetEn: "Abu al-Atahiya",
    meter: "مجزوء الكامل",
    titleAr: "لدوا للموت",
    titleEn: "Beget for death",
    textAr: "لدوا للموت وابنوا للخراب · فكلكم يصير إلى تباب",
  },
  {
    poetAr: "علي بن أبي طالب (منسوب)",
    poetEn: "Ali (attributed)",
    meter: "البسيط",
    titleAr: "الناس أكفاء",
    titleEn: "People are equals",
    textAr: "الناس من جهة التمثال أكفاء · أبوهم آدم والأم حواء",
  },
  {
    poetAr: "ابن زيدون",
    poetEn: "Ibn Zaydun",
    meter: "البسيط",
    titleAr: "أضحى التنائي",
    titleEn: "Distance replaced nearness",
    textAr: "أضحى التنائي بديلاً من تدانينا · وناب عن طيب لقيانا تجافينا",
  },
  {
    poetAr: "جرير",
    poetEn: "Jarir",
    meter: "الكامل",
    titleAr: "إن العيون",
    titleEn: "Those eyes",
    textAr: "إن العيون التي في طرفها حور · قتلننا ثم لم يحيين قتلانا",
  },
  {
    poetAr: "الفرزدق",
    poetEn: "al-Farazdaq",
    meter: "الطويل",
    titleAr: "هذا الذي تعرف البطحاء",
    titleEn: "He whom Batha knows",
    textAr: "هذا الذي تعرف البطحاء وطأته · والبيت يعرفه والحل والحرم",
  },
  {
    poetAr: "كعب بن زهير",
    poetEn: "Kaʿb b. Zuhayr",
    meter: "البسيط",
    titleAr: "بانت سعاد",
    titleEn: "Suʿad departed",
    textAr: "بانت سعاد فقلبي اليوم متبول · متيم إثرها لم يفد مكبول",
  },
  {
    poetAr: "عنترة",
    poetEn: "Antarah",
    meter: "الكامل",
    titleAr: "إذا صحوت",
    titleEn: "When I sober",
    textAr: "وإذا صحوت فما أقصر عن ندى · وكما علمت شمائلي وتكرمي",
  },
  {
    poetAr: "طرفة بن العبد",
    poetEn: "Tarafa",
    meter: "الطويل",
    titleAr: "ستبدي لك الأيام",
    titleEn: "Days will show you",
    textAr: "ستبدي لك الأيام ما كنت جاهلاً · ويأتيك بالأخبار من لم تزوّد",
  },
  {
    poetAr: "زهير بن أبي سلمى",
    poetEn: "Zuhayr",
    meter: "الطويل",
    titleAr: "ومن يجعل المعروف",
    titleEn: "Whoever puts kindness",
    textAr: "ومن يجعل المعروف من دون عرضه · يفره ومن لا يتق الشتم يشتم",
  },
  {
    poetAr: "لبيد بن ربيعة",
    poetEn: "Labid",
    meter: "الكامل",
    titleAr: "ألا كل شيء",
    titleEn: "All but Allah is vain",
    textAr: "ألا كل شيء ما خلا الله باطل · وكل نعيم لا محالة زائل",
  },
  {
    poetAr: "النابغة الذبياني",
    poetEn: "al-Nabigha",
    meter: "البسيط",
    titleAr: "فإنك كالليل",
    titleEn: "You are like the night",
    textAr: "فإنك كالليل الذي هو مدركي · وإن خلت أن المنتأى عنك واسع",
  },
  {
    poetAr: "الخنساء",
    poetEn: "al-Khansa",
    meter: "البسيط",
    titleAr: "وإن صخراً",
    titleEn: "And Sakhr",
    textAr: "وإن صخراً لتأتم الهداة به · كأنه علم في رأسه نار",
  },
  {
    poetAr: "حاتم الطائي (منسوب)",
    poetEn: "Hatim (attributed)",
    meter: "الطويل",
    titleAr: "أماوي إن المال",
    titleEn: "O Mawiyya, wealth",
    textAr: "أماوي إن المال غاد ورائح · ويبقى من المال الأحاديث والذكر",
  },
  {
    poetAr: "بشار بن برد",
    poetEn: "Bashshar",
    meter: "الكامل",
    titleAr: "الأذن تعشق",
    titleEn: "The ear loves",
    textAr: "يا قوم أذني لبعض الحي عاشقة · والأذن تعشق قبل العين أحيانا",
  },
  {
    poetAr: "أبو نواس",
    poetEn: "Abu Nuwas",
    meter: "الخفيف",
    titleAr: "دع عنك لومي",
    titleEn: "Leave off blame",
    textAr: "دع عنك لومي فإن اللوم إغراء · وداوني بالتي كانت هي الداء",
  },
  {
    poetAr: "المتنبي",
    poetEn: "al-Mutanabbi",
    meter: "الوافر",
    titleAr: "إذا غامرت في شرف",
    titleEn: "If you venture for honor",
    textAr: "إذا غامرت في شرف مروم · فلا تقنع بما دون النجوم",
  },
  {
    poetAr: "امرؤ القيس",
    poetEn: "Imruʾ al-Qays",
    meter: "الطويل",
    titleAr: "قفا نبك",
    titleEn: "Stop, let us weep",
    textAr: "قفا نبك من ذكرى حبيب ومنزل · بسقط اللوى بين الدخول فحومل",
  },
  {
    poetAr: "امرؤ القيس",
    poetEn: "Imruʾ al-Qays",
    meter: "الطويل",
    titleAr: "مكر مفر",
    titleEn: "Wheeling and fleeing",
    textAr: "مكر مفر مقبل مدبر معاً · كجلمود صخر حطه السيل من عل",
  },
  {
    poetAr: "عنترة",
    poetEn: "Antarah",
    meter: "الكامل",
    titleAr: "هل غادر الشعراء",
    titleEn: "Have poets left",
    textAr: "هل غادر الشعراء من متردم · أم هل عرفت الدار بعد توهم",
  },
  {
    poetAr: "زهير",
    poetEn: "Zuhayr",
    meter: "الطويل",
    titleAr: "ومن هاب أسباب المنايا",
    titleEn: "Whoever fears death’s causes",
    textAr: "ومن هاب أسباب المنايا ينلنه · وإن يرق أسباب السماء بسلم",
  },
  {
    poetAr: "لبيد",
    poetEn: "Labid",
    meter: "الكامل",
    titleAr: "عفت الديار",
    titleEn: "The dwellings faded",
    textAr: "عفت الديار محلها فمقامها · بمنى تأبد غولها فرجامها",
  },
];

const slug = "poetry-couplets-expanded";
const passages = EXTRA.map((c, i) => ({
  id: `TW:${slug}:${i + 1}`,
  titleAr: `${c.poetAr} · ${c.titleAr}`,
  titleEn: `${c.poetEn} · ${c.titleEn}`,
  textAr: c.textAr,
  meter: c.meter,
}));

const work = {
  slug,
  titleAr: "مختارات شعرية موسّعة",
  titleEn: "Expanded poetry anthology (sample)",
  kind: "poetry",
  source: "arabya-editorial / classical attributions (educational)",
  license: "public-domain-text-educational",
  descriptionAr:
    "عيّنة أكبر من أبيات كلاسيكية منسوبة تقليدياً — للعرض والدراسة، وليست ديواناً كاملاً.",
  descriptionEn:
    "Larger educational sample of traditionally attributed classical couplets — not a full diwan.",
  passages,
};

writeFileSync(
  join(worksDir, `${slug}.json`),
  JSON.stringify(work, null, 2) + "\n",
  "utf8",
);
console.log(`Wrote ${slug}.json (${passages.length} passages)`);

/** Append unique passages into ashaar-arudi without duplicating textAr */
const ashaarPath = join(worksDir, "ashaar-arudi.json");
if (existsSync(ashaarPath)) {
  const ashaar = JSON.parse(readFileSync(ashaarPath, "utf8"));
  const existing = new Set(
    (ashaar.passages || []).map((p) =>
      String(p.textAr || "")
        .replace(/\s+/g, " ")
        .trim(),
    ),
  );
  let added = 0;
  let nextId = (ashaar.passages?.length || 0) + 1;
  for (const c of EXTRA) {
    const key = c.textAr.replace(/\s+/g, " ").trim();
    if (existing.has(key)) continue;
    ashaar.passages = ashaar.passages || [];
    ashaar.passages.push({
      id: `TW:ashaar-arudi:${nextId}`,
      titleAr: `شطران · ${c.poetAr}`,
      titleEn: `Couplet · ${c.poetEn}`,
      textAr: c.textAr,
      meter: c.meter,
    });
    existing.add(key);
    nextId += 1;
    added += 1;
  }
  writeFileSync(ashaarPath, JSON.stringify(ashaar, null, 2) + "\n", "utf8");
  console.log(
    `Grew ashaar-arudi by ${added} (total ${ashaar.passages.length})`,
  );
}

const index = existsSync(indexPath)
  ? JSON.parse(readFileSync(indexPath, "utf8"))
  : { works: [], updatedAt: null };

const entry = {
  slug: work.slug,
  titleAr: work.titleAr,
  titleEn: work.titleEn,
  kind: work.kind,
  descriptionAr: work.descriptionAr,
  descriptionEn: work.descriptionEn,
  passageCount: passages.length,
};

const works = Array.isArray(index.works)
  ? index.works.filter((w) => w.slug !== slug && w.id !== slug)
  : [];
works.push(entry);
index.works = works;
index.updatedAt = new Date().toISOString().slice(0, 10);
index.sourceNote =
  "تراث موسّع: Ashaar عروض + مختارات شعراء + مختارات موسّعة + عيّنة سِيَر + كتالوج بن باز.";
writeFileSync(indexPath, JSON.stringify(index, null, 2) + "\n", "utf8");
console.log(`Updated heritage index (${works.length} works)`);
