# AGENTS.md

## Cursor Cloud specific instructions

`arabya-web` is a Next.js 15 (App Router, Turbopack) + React 19 + TypeScript + Tailwind 4 app. Package manager is **npm** (`package-lock.json`). There is **no database and no required `.env`** for local/dev — Quran content ships as static JSON under `/data` (read by `src/lib/quran.ts`, mushaf helpers, and API routes).

### Commands
- `npm install` — dependencies
- `npm run dev` — http://localhost:3000 (pages + local-JSON APIs)
- `npm run lint` / `npm run test` / `npm run validate-data` / `npm run build`
- Data-prep only (optional; hit Quran.com / Corpus): `fetch-data`, `fetch-tafsirs`, `fetch-translations`, `build-irab`, `build-mushaf-index`, `build-search-index`, `import-irab-book`

### Product surface (beyond mushaf reader)
| Route | Role |
|-------|------|
| `/`, `/mushaf/[page]`, `/surah/[id]` | Index + Madinah mushaf + word study |
| `/ayah/[surah]/[verse]` | Per-ayah iʿrāb narrative |
| `/juz`, `/root/[root]` | Juz hub + root concordance |
| `/books`, `/books/[slug]` | Irab book catalog (licensed import later) |
| `/resources`, `/qiraat` | Hubs / placeholders |
| `/hadith`, `/heritage` | **Placeholders only** — do not build full pipelines yet |
| `/api/tafsir/...`, `/api/translation/...`, `/api/search`, `/api/study` | Local JSON APIs |

Study UI: `MushafPageStudio` + `StudyModeTabs` (keyboard-accessible RTL tabs) + `WordStudyDock` (morph/syntax/semantics/…). Do **not** show per-layer “المصدر: …” attribution chips in the dock (removed by product decision); keep footer/about GPL credit where legally needed.

### Gotcha: do not run `next build` while `next dev` is running
Both share `.next`. A concurrent build causes `Internal Server Error` with `ENOENT ... _buildManifest.js.tmp`. Fix: stop all `next` processes, `rm -rf .next`, restart `npm run dev`.

### npm audit
Transitive `postcss` advisory inside `next` may appear. Do **not** run `npm audit fix --force` (it downgrades Next to v9). Wait for an upstream Next release.

### Sanity check
Open `/mushaf/1`, select a word, switch study tabs (الكلمات / الإعراب / تفاسير), confirm dock layers load. Run `npm run test` (Vitest) before merging.
