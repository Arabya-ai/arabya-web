"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useEffect, useMemo, useState } from "react";
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
  const t = useTranslations("Favorites");
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [notes, setNotes] = useState<AyahNote[]>([]);
  const [filter, setFilter] = useState("");

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

  const q = filter.trim().toLowerCase();

  const filteredBookmarks = useMemo(() => {
    if (!q) return bookmarks;
    return bookmarks.filter((b) => {
      const title = getSurahUthmaniTitle(b.surahId);
      return (
        title.includes(filter.trim()) ||
        String(b.surahId).includes(q) ||
        String(b.verse).includes(q) ||
        String(b.page).includes(q)
      );
    });
  }, [bookmarks, filter, q]);

  const filteredNotes = useMemo(() => {
    if (!q) return notes;
    return notes.filter((n) => {
      const title = getSurahUthmaniTitle(n.surahId);
      return (
        title.includes(filter.trim()) ||
        n.text.toLowerCase().includes(q) ||
        String(n.surahId).includes(q) ||
        String(n.verse).includes(q)
      );
    });
  }, [notes, filter, q]);

  const shownBookmarks =
    mode === "preview" ? filteredBookmarks.slice(0, 5) : filteredBookmarks;
  const shownNotes =
    mode === "preview" ? filteredNotes.slice(0, 5) : filteredNotes;

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
      {mode === "full" ? (
        <div className="library-archive-hero">
          <div className="library-archive-stats">
            <div className="library-archive-stat">
              <strong>{toArabicNumerals(bookmarks.length)}</strong>
              <span>{t("statBookmarks")}</span>
            </div>
            <div className="library-archive-stat">
              <strong>{toArabicNumerals(notes.length)}</strong>
              <span>{t("statNotes")}</span>
            </div>
            <div className="library-archive-stat">
              <strong>
                {toArabicNumerals(bookmarks.length + notes.length)}
              </strong>
              <span>{t("statTotal")}</span>
            </div>
          </div>
          <input
            type="search"
            className="library-archive-filter"
            placeholder={t("filterPlaceholder")}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            aria-label={t("filterAria")}
          />
        </div>
      ) : null}

      <section className="library-block" aria-labelledby="lib-bookmarks-h">
        <div className="library-block-head">
          <h2 id="lib-bookmarks-h">
            {t("bookmarksTitle")}{" "}
            <span className="library-count">
              ({toArabicNumerals(filteredBookmarks.length)})
            </span>
          </h2>
          {mode === "preview" ? (
            <Link href="/favorites" className="account-panel-link">
              {t("viewAll")}
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
                    {t("pageLabel", { page: toArabicNumerals(b.page) })}
                  </span>
                </Link>
                {mode === "full" ? (
                  <button
                    type="button"
                    className="library-remove"
                    onClick={() => removeBookmark(b.key)}
                  >
                    {t("remove")}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="library-empty">{t("emptyBookmarks")}</p>
        )}
      </section>

      <section className="library-block" aria-labelledby="lib-notes-h" id="notes">
        <div className="library-block-head">
          <h2 id="lib-notes-h">
            {t("notesTitle")}{" "}
            <span className="library-count">
              ({toArabicNumerals(filteredNotes.length)})
            </span>
          </h2>
          {mode === "preview" ? (
            <Link href="/favorites#notes" className="account-panel-link">
              {t("viewAll")}
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
                    {t("delete")}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="library-empty">{t("emptyNotes")}</p>
        )}
      </section>
    </div>
  );
}
