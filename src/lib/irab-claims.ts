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
import { narrativeIrab } from "@/lib/irab-narrative";
import { getIrab } from "@/lib/quran";
import type { IrabWord } from "@/lib/types";
import { makeWordId, parseWordId } from "@/lib/word-id";

const dataRoot = path.join(process.cwd(), "data");
const claimsRoot = path.join(dataRoot, "irab-claims");

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

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readClaimsIndex(): Promise<string[]> {
  const indexPath = path.join(claimsRoot, "index.json");
  if (!(await fileExists(indexPath))) return [];
  const raw = await readFile(indexPath, "utf8");
  const parsed = JSON.parse(raw) as { sources?: { id: string }[] };
  return (parsed.sources ?? [])
    .map((s) => s.id)
    .filter((id) => id && id !== QAC_IRAB_SOURCE.id);
}

async function discoverClaimSourceIds(): Promise<string[]> {
  const fromIndex = await readClaimsIndex();
  if (fromIndex.length) return fromIndex;
  try {
    const entries = await readdir(claimsRoot, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((id) => id !== QAC_IRAB_SOURCE.id);
  } catch {
    return [];
  }
}

async function loadStoredClaims(
  sourceId: string,
  surahId: number,
): Promise<StoredClaimsFile | null> {
  const filePath = path.join(claimsRoot, sourceId, `${surahId}.json`);
  if (!(await fileExists(filePath))) return null;
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw) as StoredClaimsFile;
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

export async function getIrabClaimsForWord(
  wordId: string,
  morph?: IrabWord | null,
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

  const qacText = narrativeIrab(m, "ar");
  if (m && qacText && qacText !== "—") {
    claims.push(
      claimFromQacIrab(wordId, qacText, m.irab || m.irabText || undefined),
    );
  }

  const sources = await listReadyIrabSources();
  const sourceIds = await discoverClaimSourceIds();

  for (const sourceId of sourceIds) {
    const source = resolveSourceMeta(sourceId, sources);
    if (!source) continue;
    const file = await loadStoredClaims(sourceId, parsed.surahId);
    const row = file?.words?.[wordId];
    if (row?.text?.trim()) {
      claims.push(storedWordClaim(source, wordId, row));
    }
  }

  return claims;
}

export type AyahIrabClaimsBundle = {
  byWordId: Map<string, IrabClaim[]>;
  ayahLevel: IrabClaim[];
};

export async function getIrabClaimsForAyah(
  surahId: number,
  verse: number,
): Promise<AyahIrabClaimsBundle> {
  const byWordId = new Map<string, IrabClaim[]>();
  const irab = await getIrab(surahId);
  const irabVerse = irab?.verses.find((v) => v.verseNumber === verse);

  for (const w of irabVerse?.words ?? []) {
    const wordId = w.wordId ?? makeWordId(surahId, verse, w.position);
    const claims = await getIrabClaimsForWord(wordId, w);
    if (claims.length) byWordId.set(wordId, claims);
  }

  const ayahLevel: IrabClaim[] = [];
  const verseKey = `${surahId}:${verse}`;
  const sources = await listReadyIrabSources();
  const sourceIds = await discoverClaimSourceIds();

  for (const sourceId of sourceIds) {
    const source = resolveSourceMeta(sourceId, sources);
    if (!source) continue;
    const file = await loadStoredClaims(sourceId, surahId);
    const row = file?.verses?.[verseKey];
    if (row?.text?.trim()) {
      ayahLevel.push(storedAyahClaim(source, verseKey, row));
    }
  }

  return { byWordId, ayahLevel };
}
