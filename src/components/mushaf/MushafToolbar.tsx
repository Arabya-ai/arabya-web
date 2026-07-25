"use client";

import Link from "next/link";
import { RECITERS, reciterHasWordSync } from "@/lib/audio";
import { toArabicNumerals } from "@/lib/format";
import { ShareMenu } from "@/components/ShareMenu";
import { MushafToolIcon } from "@/components/mushaf/MushafToolIcon";
import type { ShareTarget } from "@/lib/share";
import type { IrabWord } from "@/lib/types";
import type { Dispatch, SetStateAction } from "react";

type FontPrefs = {
  fontScale: number;
  fontDraft: string;
  setFontDraft: (v: string) => void;
  commitFontDraft: () => void;
  setFontScale: Dispatch<SetStateAction<number>>;
  canShrink: boolean;
  canGrow: boolean;
  FONT_SCALE_MIN: number;
  FONT_SCALE_MAX: number;
  FONT_SCALE_STEP: number;
};

type Props = {
  prefs: FontPrefs & { reciterId: string; persistReciterId: (id: string) => void };
  studySurahId: number | null;
  selected: {
    surahId: number;
    verseNumber: number;
    morph: IrabWord | null;
  } | null;
  studyBlock: { surahId: number; meta: { versesCount: number } } | null;
  surahTitle: string;
  repeatCount: number;
  setRepeatCount: (n: number) => void;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  shareTargets: ShareTarget[];
  shareNote: string | null;
  onShareStatus: (note: string | null, clearMs?: number) => void;
  clampFontScale: (n: number) => number;
  audio: {
    wbwPlaying: boolean;
    audioPlaying: boolean;
    surahPlaying: boolean;
    stopAllAudio: () => void;
    playWordByWordAudio: () => void | Promise<void>;
    playAyahAudio: () => void | Promise<void>;
    playSurahAudio: (
      surahId: number,
      versesCount: number,
      fromVerse: number,
      title: string,
    ) => void | Promise<void>;
  };
};

export function MushafToolbar({
  prefs,
  studySurahId,
  selected,
  studyBlock,
  surahTitle,
  repeatCount,
  setRepeatCount,
  bookmarked,
  onToggleBookmark,
  shareTargets,
  shareNote,
  onShareStatus,
  clampFontScale,
  audio,
}: Props) {
  return (
    <div className="mushaf-toolbar" aria-label="أدوات المصحف">
      <div
        className="mtb-group mtb-font font-scale"
        role="group"
        aria-label="حجم خط المصحف"
      >
        <button
          type="button"
          className="tool-btn"
          onClick={() =>
            prefs.setFontScale((s) =>
              clampFontScale(s - prefs.FONT_SCALE_STEP),
            )
          }
          disabled={!prefs.canShrink}
          aria-label="تصغير الخط"
          title="تصغير"
        >
          أ−
        </button>
        <label className="font-scale-field" htmlFor="mushaf-font-scale">
          <span className="sr-only">نسبة حجم الخط</span>
          <input
            id="mushaf-font-scale"
            name="mushaf-font-scale"
            type="number"
            inputMode="numeric"
            min={Math.round(prefs.FONT_SCALE_MIN * 100)}
            max={Math.round(prefs.FONT_SCALE_MAX * 100)}
            step={Math.round(prefs.FONT_SCALE_STEP * 100)}
            dir="ltr"
            className="font-scale-input"
            value={prefs.fontDraft}
            onChange={(e) => prefs.setFontDraft(e.target.value)}
            onBlur={prefs.commitFontDraft}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === "Enter") {
                e.preventDefault();
                prefs.commitFontDraft();
                (e.target as HTMLInputElement).blur();
              }
            }}
            onKeyUp={(e) => e.stopPropagation()}
            aria-label="أدخل نسبة حجم الخط يدوياً"
            title={`اكتب رقماً من ${Math.round(prefs.FONT_SCALE_MIN * 100)} إلى ${Math.round(prefs.FONT_SCALE_MAX * 100)} ثم Enter`}
          />
          <span className="font-scale-suffix" aria-hidden>
            %
          </span>
        </label>
        <button
          type="button"
          className="tool-btn"
          onClick={() =>
            prefs.setFontScale((s) =>
              clampFontScale(s + prefs.FONT_SCALE_STEP),
            )
          }
          disabled={!prefs.canGrow}
          aria-label="تكبير الخط"
          title="تكبير"
        >
          أ+
        </button>
      </div>

      <div className="mtb-group mtb-study" role="group" aria-label="دراسة">
        {studySurahId ? (
          <Link
            href={`/surah/${studySurahId}/read`}
            className="tool-btn mtb-link"
            title="دراسة السورة مع خيارات الإعراب والدراسة السريعة"
          >
            <MushafToolIcon name="study" />
            <span>
              <span className="mtb-full">دراسة السورة</span>
              <span className="mtb-short">دراسة</span>
            </span>
          </Link>
        ) : null}
        {selected ? (
          <Link
            href={`/ayah/${selected.surahId}/${selected.verseNumber}`}
            className="tool-btn mtb-link"
            title="صفحة إعراب الآية كلمة بكلمة"
          >
            <MushafToolIcon name="irab" />
            <span>
              <span className="mtb-full">إعراب الآية</span>
              <span className="mtb-short">إعراب</span>
            </span>
          </Link>
        ) : null}
        {selected?.morph?.root ? (
          <Link
            href={`/root/${encodeURIComponent(selected.morph.root)}`}
            className="tool-btn mtb-link"
            title="مواضع الجذر في القرآن"
          >
            <MushafToolIcon name="root" />
            <span>الجذر</span>
          </Link>
        ) : null}
      </div>

      <div className="mtb-group mtb-listen" role="group" aria-label="استماع">
        <span className="mtb-label" title="استماع">
          <MushafToolIcon name="listen" />
          <span className="mtb-label-text">استماع</span>
        </span>
        <label className="reciter-pick">
          <span className="sr-only">القارئ</span>
          <select
            className="reciter-select"
            value={prefs.reciterId}
            onChange={(e) => {
              prefs.persistReciterId(e.target.value);
              audio.stopAllAudio();
            }}
            aria-label="اختر القارئ"
            title="القارئ"
            disabled={!selected && !studyBlock}
          >
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nameAr}
              </option>
            ))}
          </select>
        </label>
        <label className="repeat-pick">
          <span className="sr-only">تكرار التلاوة</span>
          <select
            className="reciter-select"
            value={repeatCount}
            onChange={(e) => setRepeatCount(Number(e.target.value))}
            aria-label="عدد مرات التكرار (كلمات أو آية أو سورة)"
            title="يُطبَّق التكرار على الكلمات والآية والسورة"
            disabled={!selected && !studyBlock}
          >
            {[1, 2, 3, 5, 7, 10].map((n) => (
              <option key={n} value={n}>
                ×{toArabicNumerals(n)}
              </option>
            ))}
          </select>
        </label>
        <span className="mtb-scope-label">يُطبَّق على</span>
        <div
          className="mtb-scope"
          role="group"
          aria-label="يُطبَّق التكرار على كلمات أو آية أو سورة"
        >
          <button
            type="button"
            className={`tool-btn mtb-link ${audio.wbwPlaying ? "is-on" : ""}`}
            onClick={() => void audio.playWordByWordAudio()}
            aria-pressed={audio.wbwPlaying}
            disabled={!selected}
            title="تلاوة كلمة بكلمة — مع التكرار المحدد"
          >
            <MushafToolIcon name="words" />
            <span>{audio.wbwPlaying ? "إيقاف" : "كلمات"}</span>
          </button>
          <button
            type="button"
            className={`tool-btn mtb-link ${audio.audioPlaying ? "is-on" : ""}`}
            onClick={() => void audio.playAyahAudio()}
            aria-pressed={audio.audioPlaying}
            disabled={!selected}
            title={
              reciterHasWordSync(prefs.reciterId)
                ? "تلاوة الآية مع تمييز الكلمات"
                : "تلاوة الآية (تمييز الكلمات غير متاح لهذا القارئ — جرّب العفاسي)"
            }
          >
            <MushafToolIcon name="ayah" />
            <span>{audio.audioPlaying ? "إيقاف" : "آية"}</span>
          </button>
          <button
            type="button"
            className={`tool-btn mtb-link ${audio.surahPlaying ? "is-on" : ""}`}
            onClick={() => {
              if (!studyBlock) return;
              void audio.playSurahAudio(
                studyBlock.surahId,
                studyBlock.meta.versesCount,
                selected?.verseNumber ?? 1,
                surahTitle,
              );
            }}
            aria-pressed={audio.surahPlaying}
            disabled={!studyBlock}
            title="تلاوة السورة كاملة مع مشغّل التحكم"
          >
            <MushafToolIcon name="surah" />
            <span>{audio.surahPlaying ? "إيقاف" : "سورة"}</span>
          </button>
        </div>
      </div>

      <div className="mtb-group mtb-actions" role="group" aria-label="إجراءات">
        {selected ? (
          <button
            type="button"
            className={`tool-btn mtb-link bookmark-btn ${bookmarked ? "is-on" : ""}`}
            onClick={onToggleBookmark}
            aria-pressed={bookmarked}
          >
            <MushafToolIcon name="bookmark" />
            <span>
              {bookmarked ? (
                "مفضّلة"
              ) : (
                <>
                  <span className="mtb-full">حفظ الآية</span>
                  <span className="mtb-short">حفظ</span>
                </>
              )}
            </span>
          </button>
        ) : null}
        <ShareMenu
          targets={shareTargets}
          label="مشاركة"
          onStatus={onShareStatus}
        />
      </div>
      {shareNote ? <span className="share-note">{shareNote}</span> : null}
    </div>
  );
}
