"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List, Search } from "lucide-react";
import { LibraryBookCard } from "@/components/library/LibraryBookCard";
import {
  LIBRARY_CATEGORIES,
  libraryCategoryLabel,
  normalizeLibraryCategory,
} from "@/lib/library/categories";
import type { LibraryWorkMeta } from "@/lib/library/types";

type ViewMode = "grid" | "list";
type SortMode = "latest" | "title";

type Props = {
  locale: string;
  works: LibraryWorkMeta[];
  labels: {
    filterPlaceholder: string;
    sortLatest: string;
    sortTitle: string;
    viewGrid: string;
    viewList: string;
    count: string;
    viewBook: string;
    digitalBook: string;
    pageCount: string;
    loadMore: string;
    allShown: string;
    emptyFilter: string;
  };
  initialCategory?: string;
};

const PAGE_SIZE = 12;

export function LibraryHubClient({
  locale,
  works,
  labels,
  initialCategory,
}: Props) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("latest");
  const [view, setView] = useState<ViewMode>("grid");
  const [category, setCategory] = useState(initialCategory ?? "all");
  const [visible, setVisible] = useState(PAGE_SIZE);

  const categoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of works) {
      const id = normalizeLibraryCategory(w.category);
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [works]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = works.filter((w) => {
      if (category !== "all" && normalizeLibraryCategory(w.category) !== category) {
        return false;
      }
      if (!q) return true;
      const title = (w.title + " " + (w.titleEn ?? "") + " " + (w.author ?? "")).toLowerCase();
      return title.includes(q);
    });

    list = [...list].sort((a, b) => {
      if (sort === "title") {
        const ta = locale === "en" && a.titleEn ? a.titleEn : a.title;
        const tb = locale === "en" && b.titleEn ? b.titleEn : b.title;
        return ta.localeCompare(tb, locale === "en" ? "en" : "ar");
      }
      const da = a.publishedAt || a.importedAt || "";
      const db = b.publishedAt || b.importedAt || "";
      return db.localeCompare(da);
    });

    return list;
  }, [works, query, category, sort, locale]);

  const shown = filtered.slice(0, visible);
  const canLoadMore = visible < filtered.length;

  return (
    <div className="library-hub">
      <div className="library-toolbar">
        <div className="library-toolbar-start">
          <div className="library-view-toggle" role="group" aria-label={labels.viewGrid}>
            <button
              type="button"
              className={view === "grid" ? "is-active" : ""}
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              title={labels.viewGrid}
            >
              <LayoutGrid size={17} aria-hidden />
            </button>
            <button
              type="button"
              className={view === "list" ? "is-active" : ""}
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              title={labels.viewList}
            >
              <List size={17} aria-hidden />
            </button>
          </div>

          <label className="library-sort">
            <span className="sr-only">{labels.sortLatest}</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
            >
              <option value="latest">{labels.sortLatest}</option>
              <option value="title">{labels.sortTitle}</option>
            </select>
          </label>
        </div>

        <label className="library-search">
          <Search size={17} aria-hidden className="library-search-icon" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder={labels.filterPlaceholder}
          />
        </label>

        <p className="library-count">
          {labels.count
            .replace("{shown}", String(shown.length))
            .replace("{total}", String(filtered.length))}
        </p>
      </div>

      <div className="library-category-row" role="tablist" aria-label="Categories">
        <button
          type="button"
          role="tab"
          aria-selected={category === "all"}
          className={category === "all" ? "is-active" : ""}
          onClick={() => {
            setCategory("all");
            setVisible(PAGE_SIZE);
          }}
        >
          {locale === "en" ? "All" : "الكل"}
          <span>{works.length}</span>
        </button>
        {LIBRARY_CATEGORIES.filter((c) => (categoryCounts.get(c.id) ?? 0) > 0).map(
          (c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={category === c.id}
              className={category === c.id ? "is-active" : ""}
              onClick={() => {
                setCategory(c.id);
                setVisible(PAGE_SIZE);
              }}
            >
              {locale === "en" ? c.labelEn : c.labelAr}
              <span>{categoryCounts.get(c.id) ?? 0}</span>
            </button>
          ),
        )}
      </div>

      {shown.length === 0 ? (
        <p className="library-empty">{labels.emptyFilter}</p>
      ) : (
        <div className={view === "grid" ? "library-grid" : "library-list"}>
          {shown.map((work) => (
            <LibraryBookCard
              key={work.id}
              work={work}
              locale={locale}
              viewBookLabel={labels.viewBook}
              digitalBookLabel={labels.digitalBook}
              pageCountLabel={
                work.pageCount
                  ? labels.pageCount.replace("{count}", String(work.pageCount))
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {filtered.length > PAGE_SIZE ? (
        <div className="library-load-more-wrap">
          {canLoadMore ? (
            <button
              type="button"
              className="library-load-more"
              onClick={() => setVisible((n) => n + PAGE_SIZE)}
            >
              {labels.loadMore}
            </button>
          ) : (
            <p className="library-all-shown">{labels.allShown}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function libraryCategoryLabelForBreadcrumb(
  id: string | undefined,
  locale: string,
): string {
  return libraryCategoryLabel(id, locale);
}
