"use client";

import { Link } from "@/i18n/navigation";
import {
  BookMarked,
  BookOpen,
} from "lucide-react";
import {
  categoryCoverTone,
  libraryCategoryLabel,
} from "@/lib/library/categories";
import type { LibraryWorkMeta } from "@/lib/library/types";

type Props = {
  work: LibraryWorkMeta;
  locale: string;
  viewBookLabel: string;
  digitalBookLabel: string;
  pageCountLabel?: string;
};

export function LibraryBookCard({
  work,
  locale,
  viewBookLabel,
  digitalBookLabel,
  pageCountLabel,
}: Props) {
  const title = locale === "en" && work.titleEn ? work.titleEn : work.title;
  const category = libraryCategoryLabel(work.category, locale);
  const publisher = work.publisher || "عربية";

  return (
    <article className="library-card">
      <Link href={`/library/${work.id}`} className="library-card-cover-link">
        <div className={`library-card-cover ${categoryCoverTone(work.category)}`}>
          {work.coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={work.coverUrl}
              alt=""
              className="library-card-cover-img"
              loading="lazy"
            />
          ) : (
            <div className="library-card-cover-art" aria-hidden>
              <span className="library-card-cover-glyph">﷽</span>
              <span className="library-card-cover-mini">{title}</span>
            </div>
          )}
          <span className="library-card-badge">
            <BookOpen size={13} aria-hidden />
            {digitalBookLabel}
          </span>
          <button
            type="button"
            className="library-card-bookmark"
            aria-label={locale === "en" ? "Bookmark" : "حفظ"}
            onClick={(e) => e.preventDefault()}
          >
            <BookMarked size={16} aria-hidden />
          </button>
          <div className="library-card-publisher">
            <span className="library-card-publisher-dot" aria-hidden />
            <span>{publisher}</span>
          </div>
        </div>
      </Link>

      <div className="library-card-body">
        <span className="library-card-category">{category}</span>
        <h2 className="library-card-title">
          <Link href={`/library/${work.id}`}>{title}</Link>
        </h2>
        {pageCountLabel ? (
          <p className="library-card-meta">{pageCountLabel}</p>
        ) : null}
        <Link href={`/library/${work.id}`} className="library-card-cta">
          {viewBookLabel}
          <span aria-hidden>←</span>
        </Link>
      </div>
    </article>
  );
}
