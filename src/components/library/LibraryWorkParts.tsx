import { Link } from "@/i18n/navigation";
import {
  LIBRARY_CATEGORIES,
  categoryCoverTone,
  libraryCategoryLabel,
  normalizeLibraryCategory,
} from "@/lib/library/categories";
import type { LibraryWorkMeta } from "@/lib/library/types";
import { LibraryBookCard } from "@/components/library/LibraryBookCard";

type Props = {
  locale: string;
  works: LibraryWorkMeta[];
  activeCategory?: string;
  labels: {
    categoriesTitle: string;
    categorySearch: string;
    relatedTitle: string;
    viewBook: string;
    digitalBook: string;
    pageCount: string;
  };
};

export function LibrarySidebar({
  locale,
  works,
  activeCategory,
  labels,
}: Props) {
  const counts = new Map<string, number>();
  for (const w of works) {
    const id = normalizeLibraryCategory(w.category);
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return (
    <aside className="library-sidebar" aria-label={labels.categoriesTitle}>
      <h2>{labels.categoriesTitle}</h2>
      <label className="library-sidebar-search">
        <span className="sr-only">{labels.categorySearch}</span>
        <input type="search" placeholder={labels.categorySearch} disabled />
      </label>
      <nav className="library-sidebar-nav">
        <Link
          href="/library"
          className={!activeCategory ? "is-active" : ""}
        >
          <span>{locale === "en" ? "All books" : "كل الكتب"}</span>
          <span className="library-sidebar-count">{works.length}</span>
        </Link>
        {LIBRARY_CATEGORIES.filter((c) => (counts.get(c.id) ?? 0) > 0).map(
          (c) => (
            <Link
              key={c.id}
              href={`/library?category=${c.id}`}
              className={activeCategory === c.id ? "is-active" : ""}
            >
              <span>{locale === "en" ? c.labelEn : c.labelAr}</span>
              <span className="library-sidebar-count">
                {counts.get(c.id) ?? 0}
              </span>
            </Link>
          ),
        )}
      </nav>
    </aside>
  );
}

export function LibraryRelatedBooks({
  locale,
  works,
  currentId,
  labels,
}: {
  locale: string;
  works: LibraryWorkMeta[];
  currentId: string;
  labels: Props["labels"];
}) {
  const related = works.filter((w) => w.id !== currentId).slice(0, 3);
  if (!related.length) return null;

  return (
    <section className="library-related" aria-labelledby="library-related-title">
      <h2 id="library-related-title">{labels.relatedTitle}</h2>
      <div className="library-related-grid">
        {related.map((work) => (
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
    </section>
  );
}

export function LibraryMetaTable({
  locale,
  work,
  labels,
}: {
  locale: string;
  work: LibraryWorkMeta;
  labels: Record<string, string>;
}) {
  const title = locale === "en" && work.titleEn ? work.titleEn : work.title;
  const rows: Array<[string, string]> = [
    [labels.bookName, title],
    [labels.author, work.author || "—"],
    [labels.pages, work.pageCount ? String(work.pageCount) : "—"],
    [labels.category, libraryCategoryLabel(work.category, locale)],
    [labels.publisher, work.publisher || "عربية"],
    [labels.edition, work.edition || "—"],
    [labels.format, "PDF"],
    [
      labels.fileSize,
      work.fileSizeKb
        ? `${(work.fileSizeKb / 1024).toFixed(1)} MB`
        : "—",
    ],
  ];

  return (
    <dl className="library-meta-table">
      {rows.map(([label, value]) => (
        <div key={label} className="library-meta-row">
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function LibraryCoverPreview({
  work,
  locale,
  digitalBookLabel,
}: {
  work: LibraryWorkMeta;
  locale: string;
  digitalBookLabel: string;
}) {
  const title = locale === "en" && work.titleEn ? work.titleEn : work.title;

  return (
    <div className={`library-work-cover ${categoryCoverTone(work.category)}`}>
      {work.coverUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={work.coverUrl} alt="" className="library-work-cover-img" />
      ) : (
        <div className="library-card-cover-art" aria-hidden>
          <span className="library-card-cover-glyph">﷽</span>
          <span className="library-card-cover-mini">{title}</span>
        </div>
      )}
      <span className="library-card-badge">
        {digitalBookLabel}
      </span>
    </div>
  );
}
