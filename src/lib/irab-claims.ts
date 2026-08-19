import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import {
  claimFromQacIrab,
  listIrabSources,
  QAC_IRAB_SOURCE,
  type IrabClaim,
  type IrabSourceMeta,
} from "@/lib/claims";
import { getBookCatalog } from "@/lib/books";
import { getImportedClaimsRoot } from "@/lib/import-book/paths";
import { narrativeIrab } from "@/lib/irab-narrative";
import { getIrab } from "@/lib/quran";
import type { IrabWord } from "@/lib/types";
import { makeWordId, parseWordId } from "@/lib/word-id";

const dataRoot = path.join(process.cwd(), "data");
const claimsRoot = path.join(dataRoot, "irab-claims");

function importedClaimsRoot(): string {
  return getImportedClaimsRoot();
}

export type IrabClaimsLocale = "ar" | "en";

type StoredClaimRow = {
  text: string;
  evidence?: string;
  confidence?: "high" | "medium" | "low";
};

type StoredClaimsFile = {
  surahId: number;
  sourceId: string;
  words?: Record<string, StoredClaimRow>;
  verses?: Record<string, StoredClaimRow>;
};

export type IrabClaimsLoadContext = {
  locale: IrabClaimsLocale;
  sources: IrabSourceMeta[];
  sourceIds: string[];
  storedBySource: Map<string, StoredClaimsFile | null>;
};

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readClaimsIndexFrom(root: string): Promise<string[]> {
  const indexPath = path.join(root, "index.json");
  if (!(await fileExists(indexPath))) return [];
  const raw = await readFile(indexPath, "utf8");
  const parsed = JSON.parse(raw) as { sources?: { id: string }[] };
  return (parsed.sources ?? [])
    .map((s) => s.id)
    .filter((id) => id && id !== QAC_IRAB_SOURCE.id);
}

async function readClaimsIndex(): Promise<string[]> {
  const git = await readClaimsIndexFrom(claimsRoot);
  const imported = await readClaimsIndexFrom(importedClaimsRoot());
  return [...new Set([...git, ...imported])];
}

async function discoverClaimSourceIds(): Promise<string[]> {
  const fromIndex = await readClaimsIndex();
  const ids = new Set(fromIndex);
  for (const root of [claimsRoot, importedClaimsRoot()]) {
    try {
      const entries = await readdir(root, { withFileTypes: true });
      for (const e of entries) {
        if (e.isDirectory() && e.name !== QAC_IRAB_SOURCE.id) ids.add(e.name);
      }
    } catch {
      /* ignore */
    }
  }
  return [...ids];
}

async function loadStoredClaims(
  sourceId: string,
  surahId: number,
): Promise<StoredClaimsFile | null> {
  for (const root of [claimsRoot, importedClaimsRoot()]) {
    const filePath = path.join(root, sourceId, `${surahId}.json`);
    if (!(await fileExists(filePath))) continue;
    const raw = await readFile(filePath, "utf8");
    return JSON.parse(raw) as StoredClaimsFile;
  }
  return null;
}

export async function loadIrabClaimsContext(
  surahId: number,
  locale: IrabClaimsLocale = "ar",
): Promise<IrabClaimsLoadContext> {
  const sources = await listReadyIrabSources();
  const sourceIds = await discoverClaimSourceIds();
  const storedBySource = new Map<string, StoredClaimsFile | null>();
  await Promise.all(
    sourceIds.map(async (sourceId) => {
      storedBySource.set(
        sourceId,
        await loadStoredClaims(sourceId, surahId),
      );
    }),
  );
  return { locale, sources, sourceIds, storedBySource };
}

function resolveSourceMeta(
  sourceId: string,
  sources: IrabSourceMeta[],
): IrabSourceMeta | null {
  return sources.find((s) => s.id === sourceId) ?? null;
}

function storedWordClaim(
  source: IrabSourceMeta,
  wordId: string,
  row: StoredClaimRow,
): IrabClaim {
  return {
    id: `claim:${wordId}:syntax:${source.id}`,
    layer: "syntax",
    sourceId: source.id,
    sourceLabel: source.label,
    text: row.text,
    scope: "word",
    wordId,
    evidence: row.evidence,
    confidence: row.confidence ?? "medium",
    license: source.license,
    url: source.url,
  };
}

function storedAyahClaim(
  source: IrabSourceMeta,
  verseKey: string,
  row: StoredClaimRow,
): IrabClaim {
  return {
    id: `claim:${verseKey}:syntax:${source.id}`,
    layer: "syntax",
    sourceId: source.id,
    sourceLabel: source.label,
    text: row.text,
    scope: "ayah",
    verseKey,
    evidence: row.evidence,
    confidence: row.confidence ?? "medium",
    license: source.license,
    url: source.url,
  };
}

export async function listReadyIrabSources(): Promise<IrabSourceMeta[]> {
  const catalog = await getBookCatalog();
  return listIrabSources(catalog).filter((s) => s.status === "ready");
}

function bookClaimsForWord(
  wordId: string,
  surahId: number,
  ctx: IrabClaimsLoadContext,
): IrabClaim[] {
  const claims: IrabClaim[] = [];
  for (const sourceId of ctx.sourceIds) {
    const source = resolveSourceMeta(sourceId, ctx.sources);
    if (!source) continue;
    const file =
      ctx.storedBySource.get(sourceId) ??
      null;
    const row = file?.words?.[wordId];
    if (row?.text?.trim()) {
      claims.push(storedWordClaim(source, wordId, row));
    }
  }
  return claims;
}

export async function getIrabClaimsForWord(
  wordId: string,
  morph?: IrabWord | null,
  locale: IrabClaimsLocale = "ar",
  ctx?: IrabClaimsLoadContext,
): Promise<IrabClaim[]> {
  const parsed = parseWordId(wordId);
  if (!parsed) return [];

  const claims: IrabClaim[] = [];
  let m = morph ?? null;

  if (!m) {
    const irab = await getIrab(parsed.surahId);
    m =
      irab?.verses
        .find((v) => v.verseNumber === parsed.verse)
        ?.words.find((w) => w.position === parsed.position) ?? null;
  }

  const qacText = narrativeIrab(m, locale);
  if (m && qacText && qacText !== "—") {
    claims.push(
      claimFromQacIrab(wordId, qacText, m.irab || m.irabText || undefined),
    );
  }

  const loadCtx =
    ctx ??
    (await loadIrabClaimsContext(parsed.surahId, locale));
  claims.push(...bookClaimsForWord(wordId, parsed.surahId, loadCtx));

  return claims;
}

export type AyahIrabClaimsBundle = {
  byWordId: Map<string, IrabClaim[]>;
  ayahLevel: IrabClaim[];
};

export async function getIrabClaimsForAyah(
  surahId: number,
  verse: number,
  locale: IrabClaimsLocale = "ar",
): Promise<AyahIrabClaimsBundle> {
  const byWordId = new Map<string, IrabClaim[]>();
  const irab = await getIrab(surahId);
  const irabVerse = irab?.verses.find((v) => v.verseNumber === verse);
  const ctx = await loadIrabClaimsContext(surahId, locale);

  for (const w of irabVerse?.words ?? []) {
    const wordId = w.wordId ?? makeWordId(surahId, verse, w.position);
    const claims = await getIrabClaimsForWord(wordId, w, locale, ctx);
    if (claims.length) byWordId.set(wordId, claims);
  }

  const ayahLevel: IrabClaim[] = [];
  const verseKey = `${surahId}:${verse}`;

  for (const sourceId of ctx.sourceIds) {
    const source = resolveSourceMeta(sourceId, ctx.sources);
    if (!source) continue;
    const file = ctx.storedBySource.get(sourceId) ?? null;
    const row = file?.verses?.[verseKey];
    if (row?.text?.trim()) {
      ayahLevel.push(storedAyahClaim(source, verseKey, row));
    }
  }

  return { byWordId, ayahLevel };
}
