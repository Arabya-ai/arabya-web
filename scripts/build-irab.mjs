/**
 * Builds per-word Arabic morphology / iʿrāb summaries from
 * Quranic Arabic Corpus morphology (GPL — attribution required).
 * Source: corpus.quran.com v0.4 via mustafa0x/quran-morphology
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const sources = path.join(root, "data", "sources");
const outDir = path.join(root, "data", "irab");

/** @typedef {{ text: string, pos: string, features: string[], irab: string, meta: SegmentMeta }} Seg */
/** @typedef {{
 *  type?: string,
 *  particle?: string,
 *  root?: string,
 *  lemma?: string,
 *  caseOrMood?: string,
 *  tense?: string,
 *  form?: string,
 *  derived?: string,
 *  attrs: string[],
 *  person?: string,
 *  fam?: string,
 *  isDet: boolean,
 *  isPref: boolean,
 *  isSuff: boolean,
 *  isRealPrep: boolean,
 * }} SegmentMeta */

function uniq(parts) {
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    if (p == null) continue;
    const key = String(p).trim();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function parseFeatures(raw) {
  return String(raw || "")
    .split("|")
    .map((t) => t.trim())
    .filter(Boolean);
}

/**
 * @param {string} pos
 * @param {string[]} f
 * @param {any} terms
 * @returns {SegmentMeta}
 */
function extractMeta(pos, f, terms) {
  /** @type {SegmentMeta} */
  const meta = {
    attrs: [],
    isDet: f.includes("DET"),
    isPref: f.includes("PREF"),
    isSuff: f.includes("SUFF"),
    isRealPrep: false,
  };

  const hasPn = f.includes("PN");
  const hasPron = f.includes("PRON") || pos === "PRON";
  const hasDem = f.includes("DEM") || pos === "DEM";
  const hasRel = f.includes("REL") || pos === "REL";

  if (hasPn) meta.type = terms.types.PN;
  else if (hasPron) meta.type = terms.types.PRON;
  else if (hasDem) meta.type = terms.types.DEM;
  else if (hasRel) meta.type = terms.types.REL;
  else if (meta.isDet) meta.type = terms.particles.DET;
  else if (terms.types?.[pos]) meta.type = terms.types[pos];
  else if (pos === "P") meta.type = terms.particles.P;

  // Particle subtype from feature tags (not POS alone)
  for (const token of f) {
    if (token === "P" && pos === "P" && !meta.isDet) {
      meta.particle = terms.particles.P;
      meta.isRealPrep = true;
      continue;
    }
    const alias = terms.particle_feature_aliases?.[token];
    const particleKey = alias || token;
    if (
      terms.particles?.[particleKey] &&
      token !== "P" &&
      token !== "DET" &&
      !terms.noun_grammar?.[token] &&
      !terms.verb_tenses?.[token]
    ) {
      meta.particle = terms.particles[particleKey];
    }
  }

  // POS-only particles (NEG, CONJ, …) when not already set
  if (!meta.particle && terms.particles?.[pos] && pos !== "P") {
    meta.particle = terms.particles[pos];
  }
  if (pos === "P" && !meta.isDet && !meta.particle) {
    meta.particle = terms.particles.P;
    meta.isRealPrep = true;
  }
  if (pos === "P" && f.includes("P") && !meta.isDet) {
    meta.isRealPrep = true;
  }

  for (const token of f) {
    if (token.startsWith("ROOT:")) meta.root = token.slice(5);
    else if (token.startsWith("LEM:")) meta.lemma = token.slice(4);
    else if (token.startsWith("FAM:")) {
      const famKey = token.slice(4);
      meta.fam = terms.FAM?.[famKey] || `${terms.labels.FAM}: ${famKey}`;
    } else if (token.startsWith("VF:")) {
      const n = Number(token.slice(3));
      meta.form =
        terms.verb_forms_tri?.[n - 1] ||
        terms.verb_forms_quad?.[n - 1] ||
        String(n);
    } else if (token.startsWith("MOOD:")) {
      const mood = token.slice(5);
      meta.caseOrMood = terms.verb_grammar?.[mood] || mood;
    } else if (terms.noun_forms?.[token]) {
      meta.derived = terms.noun_forms[token];
    } else if (terms.noun_grammar?.[token]) {
      meta.caseOrMood = terms.noun_grammar[token];
    } else if (terms.verb_tenses?.[token]) {
      meta.tense = terms.verb_tenses[token];
    } else if (terms.attrs?.[token]) {
      meta.attrs.push(terms.attrs[token]);
    } else if (/^[123][MFP]?[SDP]?$/.test(token) || /^[MFP][SDP]$/.test(token)) {
      const mapped = [...token]
        .map((ch) => terms.pronoun_attrs?.[ch])
        .filter(Boolean);
      if (mapped.length) meta.person = mapped.join("، ");
    }
  }

  return meta;
}

/**
 * @param {SegmentMeta} meta
 * @param {any} terms
 */
function describeFromMeta(meta, terms) {
  const parts = [];
  if (meta.particle && meta.particle !== meta.type) parts.push(meta.particle);
  else if (meta.type) parts.push(meta.type);
  else if (meta.particle) parts.push(meta.particle);

  if (meta.derived) parts.push(meta.derived);
  if (meta.tense) parts.push(meta.tense);
  if (meta.form) parts.push(`${terms.labels.VF}: ${meta.form}`);
  if (meta.root) parts.push(`${terms.labels.ROOT}: ${meta.root}`);
  if (meta.lemma) parts.push(`${terms.labels.LEM}: ${meta.lemma}`);
  if (meta.caseOrMood) parts.push(meta.caseOrMood);
  if (meta.person) parts.push(meta.person);
  parts.push(...meta.attrs);
  if (meta.fam) parts.push(meta.fam);

  return uniq(parts).join(" — ");
}

/**
 * Classical-style synthesis across morphological segments of one word.
 * @param {Seg[]} segs
 * @param {any} terms
 */
function synthesizeWord(segs, terms) {
  if (!segs.length) return "—";

  const roles = terms.role_phrases;
  const prep = segs.find((s) => s.meta.isRealPrep);
  const nounAfterPrep = prep
    ? segs.find(
        (s) =>
          s !== prep &&
          (s.pos === "N" || s.meta.type === terms.types.PN) &&
          s.meta.caseOrMood === terms.noun_grammar.GEN,
      )
    : null;

  if (prep && nounAfterPrep && segs.length <= 3) {
    const prepLem = prep.meta.lemma || prep.text;
    const nounBits = uniq([
      nounAfterPrep.meta.type,
      nounAfterPrep.meta.derived,
      nounAfterPrep.meta.root
        ? `${terms.labels.ROOT}: ${nounAfterPrep.meta.root}`
        : "",
      nounAfterPrep.meta.lemma
        ? `${terms.labels.LEM}: ${nounAfterPrep.meta.lemma}`
        : "",
      nounAfterPrep.meta.caseOrMood,
      ...nounAfterPrep.meta.attrs,
      nounAfterPrep.meta.person,
    ]).join(" — ");
    return `${roles.jar_majrur}: حرف الجر «${prepLem}» + ${nounBits}`;
  }

  const det = segs.find((s) => s.meta.isDet);
  const noun = segs.find(
    (s) =>
      s.pos === "N" ||
      s.meta.type === terms.types.PN ||
      s.meta.type === terms.types.DEM,
  );
  if (det && noun && segs.every((s) => s === det || s === noun || s.meta.isPref)) {
    const bits = uniq([
      noun.meta.type,
      roles.defined,
      noun.meta.derived,
      noun.meta.root ? `${terms.labels.ROOT}: ${noun.meta.root}` : "",
      noun.meta.lemma ? `${terms.labels.LEM}: ${noun.meta.lemma}` : "",
      noun.meta.caseOrMood,
      ...noun.meta.attrs,
      noun.meta.person,
    ]).join(" — ");
    return bits;
  }

  const verb = segs.find((s) => s.pos === "V");
  const pronSuff = segs.find(
    (s) => s.meta.isSuff && s.meta.type === terms.types.PRON,
  );
  if (verb && pronSuff) {
    const verbBits = uniq([
      "فعل",
      verb.meta.tense,
      verb.meta.form ? `${terms.labels.VF}: ${verb.meta.form}` : "",
      verb.meta.root ? `${terms.labels.ROOT}: ${verb.meta.root}` : "",
      verb.meta.lemma ? `${terms.labels.LEM}: ${verb.meta.lemma}` : "",
      verb.meta.caseOrMood,
      verb.meta.person,
      ...verb.meta.attrs,
    ]).join(" — ");
    const pronBits = uniq([
      "ضمير متصل",
      pronSuff.meta.person,
      pronSuff.meta.lemma
        ? `${terms.labels.LEM}: ${pronSuff.meta.lemma}`
        : "",
    ]).join(" — ");
    return `${roles.verb_object_pronoun}: ${verbBits} | ${pronBits}`;
  }

  // Default: join segment descriptions, skip empty DET-only noise handled above
  return segs
    .map((s) => s.irab)
    .filter(Boolean)
    .join(" · ");
}

async function main() {
  const terms = JSON.parse(
    await readFile(path.join(sources, "morphology-terms-ar.json"), "utf8"),
  );
  const raw = await readFile(path.join(sources, "quran-morphology.txt"), "utf8");
  await mkdir(outDir, { recursive: true });

  /** @type {Map<string, Seg[]>} */
  const byWord = new Map();

  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const [loc, text, pos, featuresRaw] = line.split("\t");
    if (!loc || !text) continue;
    const [s, a, w] = loc.split(":").map(Number);
    const key = `${s}:${a}:${w}`;
    const features = parseFeatures(featuresRaw);
    const meta = extractMeta(pos, features, terms);
    const irab = describeFromMeta(meta, terms);
    // Prefer DET over bare P so DET+noun words are not labeled حرف جر
    const posTag = meta.isDet ? "DET" : pos;
    if (!byWord.has(key)) byWord.set(key, []);
    byWord.get(key).push({ text, pos: posTag, features, irab, meta });
  }

  /** @type {Map<number, any>} */
  const surahs = new Map();

  /** @type {Map<string, { root: string, count: number, occurrences: { wordId: string, surahId: number, verse: number, position: number, surface: string, lemma?: string, page?: number }[] }>} */
  const roots = new Map();

  for (const [key, segs] of byWord) {
    const [s, a, w] = key.split(":").map(Number);
    if (!surahs.has(s)) surahs.set(s, { id: s, verses: {} });
    const surah = surahs.get(s);
    if (!surah.verses[a]) surah.verses[a] = { verseNumber: a, words: [] };

    const surface = segs.map((x) => x.text).join("");
    const irabText = synthesizeWord(segs, terms);
    const root =
      segs.map((x) => x.meta.root).find(Boolean) || undefined;
    const stemSeg = segs.find(
      (x) =>
        x.meta.lemma &&
        !x.meta.isDet &&
        !x.meta.isRealPrep &&
        !(x.meta.isPref && !x.meta.root),
    );
    const lemma =
      stemSeg?.meta.lemma ||
      segs.map((x) => x.meta.lemma).find(Boolean) ||
      undefined;
    const pos = uniq(segs.map((x) => x.pos).filter(Boolean));
    const features = uniq(segs.flatMap((x) => x.features));
    const wordId = `W:${String(s).padStart(3, "0")}:${String(a).padStart(3, "0")}:${String(w).padStart(3, "0")}`;

    surah.verses[a].words.push({
      position: w,
      wordId,
      segments: surface,
      surface,
      root,
      lemma,
      pos,
      features,
      irab: irabText,
      irabText,
    });

    if (root) {
      if (!roots.has(root)) {
        roots.set(root, { root, count: 0, occurrences: [] });
      }
      const entry = roots.get(root);
      entry.count += 1;
      entry.occurrences.push({
        wordId,
        surahId: s,
        verse: a,
        position: w,
        surface,
        lemma,
      });
    }
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
          license: "GNU GPL — attribution required",
          verses,
        },
        null,
        0,
      ),
      "utf8",
    );
    process.stdout.write(`irab surah ${id}\n`);
  }

  const rootsList = [...roots.values()].sort((a, b) =>
    a.root.localeCompare(b.root, "ar"),
  );
  await writeFile(
    path.join(root, "data", "roots-index.json"),
    JSON.stringify(
      {
        source: "Quranic Arabic Corpus morphology",
        sourceUrl: "http://corpus.quran.com",
        license: "GNU GPL — attribution required",
        rootCount: rootsList.length,
        occurrenceCap: null,
        note: "occurrences list every morph word with ROOT; count is the full corpus total.",
        roots: rootsList,
      },
      null,
      0,
    ),
    "utf8",
  );

  await writeFile(
    path.join(root, "data", "irab-index.json"),
    JSON.stringify(
      {
        source: "Quranic Arabic Corpus",
        sourceUrl: "http://corpus.quran.com",
        license: "GNU GPL — attribution required",
        note: "Structured morphological iʿrāb (not full classical parsing). Includes root/lemma/pos for Word Studio.",
        surahCount: surahs.size,
        rootCount: rootsList.length,
      },
      null,
      2,
    ),
    "utf8",
  );

  // Spot-check Al-Fatiha 1:1
  const fatiha = surahs.get(1);
  const v1 = fatiha?.verses[1]?.words?.slice(0, 4);
  console.log("Sample 1:1:", JSON.stringify(v1, null, 2));
  console.log("Done iʿrāb for", surahs.size, "surahs,", rootsList.length, "roots");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
