"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { IrabWord, QuranWord, VerseTranslationEdition } from "@/lib/types";
import { formatVerseKey } from "@/lib/format";
import { normalizeForHafsFont } from "@/lib/quran-text";
import { formatPosLabels } from "@/lib/morph-labels";
import {
  listIrabSources,
  type IrabSourceMeta,
} from "@/lib/claims";
import {
  lexiconCardLines,
  narrativeIrab,
} from "@/lib/irab-narrative";

type MeaningLang = "ar" | "en" | "id" | "ur";

type Props = {
  verseKey: string;
  word: QuranWord;
  morph: IrabWord | null | undefined;
  meaningLang: MeaningLang;
  onMeaningLang: (lang: MeaningLang) => void;
  verseEditions: VerseTranslationEdition[];
  verseEdition: string;
  onVerseEdition: (slug: string) => void;
  verseTranslation: string | null;
  bookSources?: IrabSourceMeta[];
};

const LAYERS: { id: string; label: string }[] = [
  { id: "morph", label: "صرف" },
  { id: "syntax", label: "إعراب" },
  { id: "semantics", label: "دلالة" },
  { id: "lexicon", label: "معجم" },
  { id: "translation", label: "ترجمة" },
  { id: "rhetoric", label: "بلاغة" },
];

const MEANING_LABELS: { id: MeaningLang; label: string }[] = [
  { id: "ar", label: "عربي" },
  { id: "en", label: "EN" },
  { id: "id", label: "ID" },
  { id: "ur", label: "UR" },
];

function wordMeaning(word: QuranWord, lang: MeaningLang): string {
  if (lang === "ar") return word.meaningAr || word.meaning || "";
  if (lang === "id") return word.meaningId || word.meaning || "";
  if (lang === "ur") return word.meaningUr || word.meaning || "";
  return word.meaning || "";
}

export function WordStudyDock({
  verseKey,
  word,
  morph,
  meaningLang,
  onMeaningLang,
  verseEditions,
  verseEdition,
  onVerseEdition,
  verseTranslation,
  bookSources = [],
}: Props) {
  const [layer, setLayer] = useState("syntax");
  const sources = useMemo(
    () => listIrabSources(bookSources),
    [bookSources],
  );
  const [irabSourceId, setIrabSourceId] = useState("qac");
  const activeSource =
    sources.find((s) => s.id === irabSourceId) ?? sources[0];

  const qacNarrative = narrativeIrab(morph ?? null);
  const lexicon = lexiconCardLines(morph ?? null);

  return (
    <section className="word-dock" aria-live="polite">
      <div className="word-dock-head">
        <span className="word-dock-key">{formatVerseKey(verseKey)}</span>
        <p className="word-dock-ar">{normalizeForHafsFont(word.text)}</p>
        {word.transliteration ? (
          <p className="word-dock-tr">{word.transliteration}</p>
        ) : null}
      </div>

      <div className="layer-rail" role="tablist" aria-label="طبقات تحليل الكلمة">
        {LAYERS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            aria-selected={layer === l.id}
            className={`layer-chip ${layer === l.id ? "is-active" : ""}`}
            onClick={() => setLayer(l.id)}
          >
            {l.label}
          </button>
        ))}
      </div>

      <article className="analysis-card is-ready layer-panel">
        {layer === "morph" ? (
          <>
            <h3>الصرف</h3>
            <div className="morph-facts morph-facts--inline">
              {morph?.root ? (
                <Link
                  href={`/root/${encodeURIComponent(morph.root)}`}
                  className="morph-chip"
                >
                  جذر: {morph.root}
                </Link>
              ) : null}
              {morph?.lemma ? (
                <span className="morph-chip">مادة: {morph.lemma}</span>
              ) : null}
              {morph?.pos?.length ? (
                <span className="morph-chip">
                  {formatPosLabels(morph.pos, morph.features)}
                </span>
              ) : null}
              {morph?.features?.length ? (
                <span className="morph-chip morph-chip--muted">
                  {morph.features.filter((f) => !f.startsWith("LEM:") && !f.startsWith("ROOT:") && !f.startsWith("VF:")).slice(0, 8).join(" · ")}
                </span>
              ) : null}
            </div>
            <p className="layer-source">المصدر: المدونة القرآنية العربية (QAC)</p>
          </>
        ) : null}

        {layer === "syntax" ? (
          <>
            <div className="claims-source-row">
              <h3>الإعراب</h3>
              <select
                className="claims-source-select"
                value={activeSource?.id ?? "qac"}
                onChange={(e) => setIrabSourceId(e.target.value)}
                aria-label="مصدر الإعراب"
              >
                {sources.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.status !== "ready"}>
                    {s.label}
                    {s.status !== "ready" ? " (قريبًا)" : ""}
                  </option>
                ))}
              </select>
            </div>
            {activeSource?.id === "qac" || activeSource?.status === "ready" ? (
              <p>{qacNarrative}</p>
            ) : (
              <p className="layer-soon">
                هذا المصدر بانتظار ملف مرخّص من المالك — انظر{" "}
                <Link href="/books">كتب الإعراب</Link>.
              </p>
            )}
            <p className="layer-source">
              Claim · {activeSource?.label}
              {activeSource?.license ? ` · ${activeSource.license}` : ""}
            </p>
          </>
        ) : null}

        {layer === "semantics" ? (
          <>
            <h3>الدلالة</h3>
            <div className="lang-switch" role="group" aria-label="لغة المعنى">
              {MEANING_LABELS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`lang-chip ${meaningLang === l.id ? "is-active" : ""}`}
                  onClick={() => onMeaningLang(l.id)}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <p>{wordMeaning(word, meaningLang) || "—"}</p>
            {meaningLang === "ar" ? (
              <p className="meaning-ar-note">
                معنى دراسي من معجم مواد عربْية / الصرف — ليس نسخة من كتب مواقع أخرى.
              </p>
            ) : null}
          </>
        ) : null}

        {layer === "lexicon" ? (
          <>
            <h3>المعجم</h3>
            {lexicon.length ? (
              <ul className="lexicon-list">
                {lexicon.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : (
              <p>—</p>
            )}
            {morph?.root ? (
              <p>
                <Link href={`/root/${encodeURIComponent(morph.root)}`}>
                  مواضع الجذر «{morph.root}» في القرآن
                </Link>
              </p>
            ) : null}
          </>
        ) : null}

        {layer === "translation" ? (
          <>
            <h3>ترجمة الآية</h3>
            {verseEditions.length ? (
              <>
                <select
                  className="verse-trans-select"
                  value={verseEdition}
                  onChange={(e) => onVerseEdition(e.target.value)}
                  aria-label="اختر ترجمة الآية"
                >
                  {verseEditions.map((e) => (
                    <option key={e.slug} value={e.slug}>
                      {e.nameAr}
                    </option>
                  ))}
                </select>
                <p className="verse-trans-body" dir="auto">
                  {verseTranslation || "جارٍ التحميل…"}
                </p>
              </>
            ) : (
              <p>لا تتوفر ترجمات محمّلة.</p>
            )}
          </>
        ) : null}

        {layer === "rhetoric" ? (
          <>
            <h3>البلاغة</h3>
            <p className="layer-soon">
              طبقة بلاغية جاهزة للربط بمصادر مرخّصة (مثل شروح البلاغة القرآنية).
              المحتوى سيظهر هنا عند توفر الترخيص — دون نسخ من مواقع المنافسين.
            </p>
          </>
        ) : null}
      </article>
    </section>
  );
}
