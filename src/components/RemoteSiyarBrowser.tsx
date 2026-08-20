"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { apiGet } from "@/lib/api-client";

type Item = {
  id: number;
  titleAr: string;
  textAr: string;
  dateNote?: string;
};

type Payload = {
  ok?: boolean;
  page?: number;
  totalPages?: number;
  total?: number;
  source?: string;
  items?: Item[];
  error?: string;
};

export function RemoteSiyarBrowser() {
  const t = useTranslations("Heritage");
  const locale = useLocale();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [draft, setDraft] = useState("");
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "15",
    });
    if (q) params.set("q", q);
    void (async () => {
      try {
        const res = await apiGet(`/api/remote/siyar?${params.toString()}`, {
          cache: "no-store",
        });
        const json = (await res.json()) as Payload;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ ok: false, error: "network" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, q]);

  const items = data?.items ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <section className="remote-siyar" aria-label={t("remoteSiyarTitle")}>
      <h2>{t("remoteSiyarTitle")}</h2>
      <p className="layer-hint">{t("remoteSiyarLead")}</p>
      {data?.source ? (
        <p className="layer-hint">
          {t("remoteSource", { source: data.source })}
        </p>
      ) : null}

      <form
        className="remote-siyar-search"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQ(draft.trim());
        }}
      >
        <label className="sr-only" htmlFor="siyar-q">
          {t("remoteSearchLabel")}
        </label>
        <input
          id="siyar-q"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("remoteSearchPlaceholder")}
          dir="rtl"
        />
        <button type="submit">{t("remoteSearch")}</button>
      </form>

      {loading ? <p className="layer-hint">{t("remoteLoading")}</p> : null}
      {!loading && data?.ok === false ? (
        <p className="layer-hint">{t("remoteError")}</p>
      ) : null}

      <ul className="remote-siyar-list">
        {items.map((ev) => (
          <li key={ev.id}>
            <article className="heritage-passage">
              <h3>{ev.titleAr}</h3>
              {ev.dateNote ? (
                <p className="heritage-meter">{ev.dateNote}</p>
              ) : null}
              <p className="heritage-text" dir="rtl" lang="ar">
                {ev.textAr}
              </p>
            </article>
          </li>
        ))}
      </ul>

      {totalPages > 1 ? (
        <nav className="hadith-pager" aria-label={t("remotePagerAria")}>
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {locale === "en" ? "Previous" : "السابق"}
          </button>
          <span>
            {t("remotePageOf", { page, total: totalPages, count: data?.total ?? 0 })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            {locale === "en" ? "Next" : "التالي"}
          </button>
        </nav>
      ) : null}
    </section>
  );
}
