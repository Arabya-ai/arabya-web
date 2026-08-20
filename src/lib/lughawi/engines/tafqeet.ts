/** Arabic number-to-words (تفقيط) for integers — MSA formal style. */

const ONES = [
  "",
  "واحد",
  "اثنان",
  "ثلاثة",
  "أربعة",
  "خمسة",
  "ستة",
  "سبعة",
  "ثمانية",
  "تسعة",
  "عشرة",
  "أحد عشر",
  "اثنا عشر",
  "ثلاثة عشر",
  "أربعة عشر",
  "خمسة عشر",
  "ستة عشر",
  "سبعة عشر",
  "ثمانية عشر",
  "تسعة عشر",
];

const TENS = [
  "",
  "",
  "عشرون",
  "ثلاثون",
  "أربعون",
  "خمسون",
  "ستون",
  "سبعون",
  "ثمانون",
  "تسعون",
];

const HUNDREDS = [
  "",
  "مائة",
  "مائتان",
  "ثلاثمائة",
  "أربعمائة",
  "خمسمائة",
  "ستمائة",
  "سبعمائة",
  "ثمانمائة",
  "تسعمائة",
];

function underHundred(n: number): string {
  if (n < 20) return ONES[n]!;
  const t = Math.floor(n / 10);
  const o = n % 10;
  if (!o) return TENS[t]!;
  return `${ONES[o]} و${TENS[t]}`;
}

function underThousand(n: number): string {
  if (n < 100) return underHundred(n);
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (!rest) return HUNDREDS[h]!;
  return `${HUNDREDS[h]} و${underHundred(rest)}`;
}

/** Convert non-negative integer 0…999_999_999 to Arabic words. */
export function numberToArabicWords(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  n = Math.floor(n);
  if (n === 0) return "صفر";
  if (n < 1000) return underThousand(n);

  const parts: string[] = [];
  const millions = Math.floor(n / 1_000_000);
  const thousands = Math.floor((n % 1_000_000) / 1000);
  const rest = n % 1000;

  if (millions) {
    if (millions === 1) parts.push("مليون");
    else if (millions === 2) parts.push("مليونان");
    else if (millions >= 3 && millions <= 10)
      parts.push(`${underThousand(millions)} ملايين`);
    else parts.push(`${underThousand(millions)} مليون`);
  }
  if (thousands) {
    if (thousands === 1) parts.push("ألف");
    else if (thousands === 2) parts.push("ألفان");
    else if (thousands >= 3 && thousands <= 10)
      parts.push(`${underThousand(thousands)} آلاف`);
    else parts.push(`${underThousand(thousands)} ألف`);
  }
  if (rest) parts.push(underThousand(rest));
  return parts.join(" و");
}

/** Replace digit sequences in text with tafqeet suggestions applied. */
export function applyTafqeet(text: string): {
  result: string;
  replacements: { from: string; to: string }[];
} {
  const replacements: { from: string; to: string }[] = [];
  const result = text.replace(/\d+/g, (digits) => {
    const n = Number(digits);
    if (!Number.isFinite(n)) return digits;
    const words = numberToArabicWords(n);
    if (!words) return digits;
    replacements.push({ from: digits, to: words });
    return words;
  });
  return { result, replacements };
}
