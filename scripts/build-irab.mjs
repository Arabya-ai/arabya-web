/**
 * Builds per-word Arabic iʿrāb summaries from Quranic Arabic Corpus morphology.
 * Source: https://github.com/mustafa0x/quran-morphology (based on corpus.quran.com v0.4, GPL)
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sources = path.join(root, "data", "sources");
const outDir = path.join(root, "data", "irab");

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function describeSegment(pos, features, terms) {
  const parts = [];
  const f = features.split("|").filter(Boolean);

  const typeKey = pos === "N" && f.includes("PN") ? "PN" : pos;
  if (terms.types?.[typeKey]) parts.push(terms.types[typeKey]);
  else if (terms.particles?.[typeKey]) parts.push(terms.particles[typeKey]);

  for (const token of f) {
    if (token === "PREF" || token === "SUFF") continue;
    if (token.startsWith("ROOT:")) {
      parts.push(`${terms.labels.ROOT}: ${token.slice(5)}`);
      continue;
    }
    if (token.startsWith("LEM:")) {
      parts.push(`${terms.labels.LEM}: ${token.slice(4)}`);
      continue;
    }
    if (token.startsWith("VF:")) {
      const n = Number(token.slice(3));
      const form =
        terms.verb_forms_tri?.[n - 1] ||
        terms.verb_forms_quad?.[n - 1] ||
        String(n);
      parts.push(`${terms.labels.VF}: ${form}`);
      continue;
    }
    if (token.startsWith("MOOD:")) {
      const mood = token.slice(5);
      parts.push(
        `${terms.labels.MOOD}: ${terms.verb_grammar?.[mood] || mood}`,
      );
      continue;
    }
    if (terms.particles?.[token]) {
      parts.push(terms.particles[token]);
      continue;
    }
    if (terms.noun_forms?.[token]) {
      parts.push(terms.noun_forms[token]);
      continue;
    }
    if (terms.noun_grammar?.[token]) {
      parts.push(terms.noun_grammar[token]);
      continue;
    }
    if (terms.verb_tenses?.[token]) {
      parts.push(terms.verb_tenses[token]);
      continue;
    }
    if (terms.attrs?.[token]) {
      parts.push(terms.attrs[token]);
      continue;
    }
    if (terms.other?.[token]) {
      parts.push(terms.other[token]);
      continue;
    }
    if (/^[123][MFP]?[SDP]?$/.test(token) || /^[MFP][SDP]$/.test(token)) {
      const mapped = [...token]
        .map((ch) => terms.pronoun_attrs?.[ch])
        .filter(Boolean);
      if (mapped.length) parts.push(mapped.join("، "));
    }
  }

  return parts.filter(Boolean).join(" — ");
}

async function main() {
  const terms = JSON.parse(
    await readFile(path.join(sources, "morphology-terms-ar.json"), "utf8"),
  );
  const raw = await readFile(path.join(sources, "quran-morphology.txt"), "utf8");
  await mkdir(outDir, { recursive: true });

  /** @type {Map<string, {text: string, irab: string}[]>} */
  const byWord = new Map();

  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const [loc, text, pos, features] = line.split("\t");
    if (!loc || !text) continue;
    const [s, a, w] = loc.split(":").map(Number);
    const key = `${s}:${a}:${w}`;
    const irab = describeSegment(pos, features || "", terms);
    if (!byWord.has(key)) byWord.set(key, []);
    byWord.get(key).push({ text, irab });
  }

  /** @type {Map<number, any>} */
  const surahs = new Map();

  for (const [key, segs] of byWord) {
    const [s, a, w] = key.split(":").map(Number);
    if (!surahs.has(s)) surahs.set(s, { id: s, verses: {} });
    const surah = surahs.get(s);
    if (!surah.verses[a]) surah.verses[a] = { verseNumber: a, words: [] };
    surah.verses[a].words.push({
      position: w,
      segments: segs.map((x) => x.text).join(""),
      irab: segs
        .map((x) => x.irab)
        .filter(Boolean)
        .join(" | "),
    });
  }

  for (const [id, surah] of surahs) {
    const verses = Object.values(surah.verses)
      .sort((a, b) => a.verseNumber - b.verseNumber)
      .map((v) => ({
        verseNumber: v.verseNumber,
        words: v.words.sort((a, b) => a.position - b.position),
      }));
    await writeFile(
      path.join(outDir, `${id}.json`),
      JSON.stringify(
        {
          id,
          source:
            "Quranic Arabic Corpus morphology (corpus.quran.com) via mustafa0x/quran-morphology",
          sourceUrl: "http://corpus.quran.com",
          verses,
        },
        null,
        0,
      ),
      "utf8",
    );
    process.stdout.write(`irab surah ${id}\n`);
  }

  await writeFile(
    path.join(root, "data", "irab-index.json"),
    JSON.stringify(
      {
        source: "Quranic Arabic Corpus",
        sourceUrl: "http://corpus.quran.com",
        license: "GNU GPL — attribution required",
        surahCount: surahs.size,
      },
      null,
      2,
    ),
    "utf8",
  );

  console.log("Done iʿrāb for", surahs.size, "surahs");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { stripHtml };
