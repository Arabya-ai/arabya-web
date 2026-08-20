/**
 * Remote heritage encyclopedia (rn0x/Historical_Encyclopedia) — fetched and
 * cached in process memory, never committed as a full dump to Git.
 */

export type RemoteSiyarEvent = {
  id: number;
  titleAr: string;
  textAr: string;
  dateNote?: string;
};

type CacheShape = {
  loadedAt: number;
  events: RemoteSiyarEvent[];
};

const HIST_URL =
  "https://raw.githubusercontent.com/rn0x/Historical_Encyclopedia/main/database/history.json";

const g = globalThis as unknown as {
  __arabyaSiyarCache?: CacheShape;
};

function mapEvent(raw: {
  id?: number;
  title?: string;
  text?: string;
  date?: string[] | string;
}): RemoteSiyarEvent {
  const dateNote = Array.isArray(raw.date)
    ? raw.date.join(" · ")
    : raw.date
      ? String(raw.date)
      : undefined;
  return {
    id: Number(raw.id) || 0,
    titleAr: String(raw.title || "").trim(),
    textAr: String(raw.text || raw.title || "").slice(0, 1200),
    dateNote,
  };
}

export async function loadRemoteSiyarEvents(): Promise<RemoteSiyarEvent[]> {
  const cached = g.__arabyaSiyarCache;
  const freshMs = 6 * 60 * 60 * 1000;
  if (cached && Date.now() - cached.loadedAt < freshMs) {
    return cached.events;
  }
  const res = await fetch(HIST_URL, {
    headers: { "User-Agent": "arabya-web-remote-siyar", Accept: "application/json" },
    next: { revalidate: 21600 },
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) {
    throw new Error(`siyar remote ${res.status}`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new Error("siyar remote: not an array");
  const events = data.map((row) =>
    mapEvent(row as { id?: number; title?: string; text?: string; date?: string[] }),
  );
  g.__arabyaSiyarCache = { loadedAt: Date.now(), events };
  return events;
}

export async function pageRemoteSiyar(opts: {
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<{
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  source: string;
  items: RemoteSiyarEvent[];
}> {
  const all = await loadRemoteSiyarEvents();
  const q = (opts.q || "").trim();
  const filtered = q
    ? all.filter(
        (e) =>
          e.titleAr.includes(q) ||
          e.textAr.includes(q) ||
          (e.dateNote || "").includes(q),
      )
    : all;
  const pageSize = Math.min(Math.max(opts.pageSize ?? 20, 5), 50);
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(Math.max(opts.page ?? 1, 1), totalPages);
  const start = (page - 1) * pageSize;
  return {
    page,
    pageSize,
    total,
    totalPages,
    source: "rn0x/Historical_Encyclopedia (live GitHub raw)",
    items: filtered.slice(start, start + pageSize),
  };
}
