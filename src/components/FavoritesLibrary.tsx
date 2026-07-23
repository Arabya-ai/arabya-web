"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CLOUD_SYNC_EVENT } from "@/lib/cloud-sync-client";
import { type Bookmark, readBookmarks, writeBookmarks } from "@/lib/bookmarks";
import { type AyahNote, readAyahNotes, saveAyahNote } from "@/lib/ayah-notes";
import { getMushafPageHref, toArabicNumerals } from "@/lib/format";
import { getSurahUthmaniTitle } from "@/lib/surah-names";

function refresh() {
  return {
    bookmarks: readBookmarks(),
    notes: readAyahNotes().filter((n) => n.text.trim()),
  };
}

export function FavoritesLibrary({
  mode = "full",
}: {
  mode?: "full" | "preview";
}) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<AyahNote[]>([]);

  useEffect(() => {
    const load = () => {
      const data = refresh();
      setBookmarks(data.bookmarks);
      setNotes(data.notes);
    };
    load();
    window.addEventListener(CLOUD_SYNC_EVENT, load);
    window.addEventListener("focus", load);
    return () => {
      window.removeEventListener(CLOUD_SYNC_EVENT, load);
      window.removeEventListener("focus", load);
    };
  }, []);

  const shownBookmarks = mode === "preview" ? bookmarks.slice(0, 5) : bookmarks;
  const shownNotes = mode === "preview" ? notes.slice(0, 5) : notes;

  function removeBookmark(key: string) {
    writeBookmarks(readBookmarks().filter((b) => b.key !== key));
    setBookmarks(readBookmarks());
  }

  function removeNote(key: string) {
    saveAyahNote({
      key,
      surahId: Number(key.split(":")[0]) || 1,
      verse: Number(key.split(":")[1]) || 1,
      text: "",
    });
    setNotes(readAyahNotes().filter((n) => n.text.trim()));
  }

  return (
    <div className="library-stack">
      <section className="library-block" aria-labelledby="lib-bookmarks-h">
        <div className="library-block-head">
          <h2 id="lib-bookmarks-h">
            المفضّلات{" "}
            <span className="library-count">
              ({toArabicNumerals(bookmarks.length)})
            </span>
          </h2>
          {mode === "preview" ? (
            <Link href="/favorites" className="account-panel-link">
              عرض الكل
            </Link>
          ) : null}
        </div>
        {shownBookmarks.length ? (
          <ul className="bookmarks-list library-list">
            {shownBookmarks.map((b) => (
              <li key={b.key} className="library-row">
                <Link
                  href={`${getMushafPageHref(b.page)}#s${b.surahId}-v-${b.verse}`}
                >
                  {getSurahUthmaniTitle(b.surahId)} —{" "}
                  {toArabicNumerals(b.verse)}
                  <span className="library-meta">
                    صفحة {toArabicNumerals(b.page)}
                  </span>
                </Link>
                {mode === "full" ? (
                  <button
                    type="button"
                    className="library-remove"
                    onClick={() => removeBookmark(b.key)}
                  >
                    إزالة
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="library-empty">لا مفضّلات بعد. أضفها من صفحة المصحف.</p>
        )}
      </section>

      <section className="library-block" aria-labelledby="lib-notes-h">
        <div className="library-block-head">
          <h2 id="lib-notes-h">
            الملاحظات{" "}
            <span className="library-count">
              ({toArabicNumerals(notes.length)})
            </span>
          </h2>
          {mode === "preview" ? (
            <Link href="/favorites#notes" className="account-panel-link">
              عرض الكل
            </Link>
          ) : null}
        </div>
        {shownNotes.length ? (
          <ul className="library-list">
            {shownNotes.map((n) => (
              <li key={n.key} className="library-row library-row--note">
                <div>
                  <Link
                    href={`/ayah/${n.surahId}/${n.verse}`}
                    className="library-note-title"
                  >
                    {getSurahUthmaniTitle(n.surahId)} —{" "}
                    {toArabicNumerals(n.verse)}
                  </Link>
                  <p className="library-note-body">{n.text}</p>
                </div>
                {mode === "full" ? (
                  <button
                    type="button"
                    className="library-remove"
                    onClick={() => removeNote(n.key)}
                  >
                    حذف
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="library-empty">لا ملاحظات بعد. اكتبها من دراسة الآية.</p>
        )}
      </section>
    </div>
  );
}
