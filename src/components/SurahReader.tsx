"use client";

import { useState } from "react";
import type { Ayah, QuranWord } from "@/lib/types";

function WordButton({
  word,
  active,
  onSelect,
}: {
  word: QuranWord;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`q-word ${active ? "is-active" : ""}`}
      onClick={onSelect}
      aria-pressed={active}
    >
      <span className="q-word-ar">{word.text}</span>
      <span className="q-word-en">{word.meaning}</span>
    </button>
  );
}

export function AyahBlock({ ayah }: { ayah: Ayah }) {
  const [selected, setSelected] = useState<number | null>(null);
  const active = ayah.words.find((w) => w.position === selected) ?? null;

  return (
    <article className="ayah-block" id={`ayah-${ayah.verseNumber}`}>
      <div className="ayah-head">
        <span className="ayah-num">{ayah.verseKey}</span>
      </div>
      <div className="ayah-words" dir="rtl">
        {ayah.words.map((word) => (
          <WordButton
            key={word.position}
            word={word}
            active={selected === word.position}
            onSelect={() =>
              setSelected((prev) =>
                prev === word.position ? null : word.position,
              )
            }
          />
        ))}
      </div>
      {active ? (
        <div className="word-detail" role="status">
          <p className="word-detail-ar">{active.text}</p>
          <p>
            <strong>المعنى:</strong> {active.meaning || "—"}
          </p>
          {active.transliteration ? (
            <p>
              <strong>النطق:</strong> {active.transliteration}
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function SurahReader({ verses }: { verses: Ayah[] }) {
  return (
    <div className="surah-reader">
      {verses.map((ayah) => (
        <AyahBlock key={ayah.verseKey} ayah={ayah} />
      ))}
    </div>
  );
}
