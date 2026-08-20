import { describe, expect, it } from "vitest";
import {
  extractNarratorEnFromText,
  extractNarratorsFromArabic,
} from "./hadith-isnad-parse";

describe("hadith-isnad-parse", () => {
  it("extracts classical ḥaddathanā chain", () => {
    const arabic =
      "حَدَّثَنَا الْحُمَيْدِيُّ عَبْدُ اللَّهِ بْنُ الزُّبَيْرِ ، قَالَ : حَدَّثَنَا سُفْيَانُ ، قَالَ : حَدَّثَنَا يَحْيَى بْنُ سَعِيدٍ الْأَنْصَارِيُّ ، قَالَ : أَخْبَرَنِي مُحَمَّدُ بْنُ إِبْرَاهِيمَ التَّيْمِيُّ ، أَنَّهُ سَمِعَ عَلْقَمَةَ بْنَ وَقَّاصٍ اللَّيْثِيَّ ، يَقُولُ : سَمِعْتُ عُمَرَ بْنَ الْخَطَّابِ رَضِيَ اللَّهُ عَنْهُ عَلَى الْمِنْبَرِ ، قَالَ : سَمِعْتُ رَسُولَ اللَّهِ صلى الله عليه وسلم يَقُولُ";
    const names = extractNarratorsFromArabic(arabic);
    expect(names[0]).toContain("الحميدي");
    expect(names.some((n) => /سفيان/.test(n))).toBe(true);
    expect(names.every((n) => !/رسول الله/.test(n))).toBe(true);
  });

  it("extracts companion-led Nawawi style", () => {
    const arabic =
      "عَنْ أَمِيرِ الْمُؤْمِنِينَ أَبِي حَفْصٍ عُمَرَ بْنِ الْخَطَّابِ رَضِيَ اللهُ عَنْهُ قَالَ: سَمِعْتُ رَسُولَ اللَّهِ";
    const names = extractNarratorsFromArabic(arabic);
    expect(names.length).toBe(1);
    expect(names[0]).toContain("عمر");
  });

  it("parses English Narrated lead-in", () => {
    expect(
      extractNarratorEnFromText(
        "Narrated 'Umar bin Al-Khattab: I heard Allah's Messenger",
      ),
    ).toContain("Umar");
  });
});
