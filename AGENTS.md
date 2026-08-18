# AGENTS.md

## Cursor Cloud specific instructions

`arabya-web` is a Next.js 15 (App Router, Turbopack) + React 19 + TypeScript + Tailwind 4 app. Package manager is **npm** (`package-lock.json`). There is **no database and no required `.env`** for local/dev — Quran content ships as static JSON under `/data` (read by `src/lib/quran.ts`, mushaf helpers, and API routes).

### Commands
- `npm install` — dependencies
- `npm run dev` — http://localhost:3000 (pages + local-JSON APIs)
- `npm run lint` / `npm run test` / `npm run validate-data` / `npm run build`
- Data-prep only (optional; hit Quran.com / Corpus): `fetch-data`, `fetch-tafsirs`, `fetch-translations`, `build-irab`, `build-mushaf-index`, `build-search-index`, `import-irab-book`
- **Translations:** use `npm run fetch-translations` → `scripts/fetch-new-translations.mjs` (extends `data/translations/index.json`). Do **not** run `npm run fetch-translations-legacy` on production data — it can wipe the expanded edition index.
- **Sync Worker:** do **not** add `"arabya-web": "file:../.."` under `workers/arabya-sync` — that junction breaks `next build` (Turbopack infinite loop). The worker is standalone.

### Product surface (beyond mushaf reader)
| Route | Role |
|-------|------|
| `/`, `/mushaf/[page]`, `/surah/[id]` | Index + Madinah mushaf + word study |
| `/ayah/[surah]/[verse]` | Per-ayah iʿrāb narrative |
| `/juz`, `/root/[root]` | Juz hub + root concordance |
| `/books`, `/books/[slug]` | Irab book catalog (licensed import later) |
| `/adhkar`, `/adhkar/[slug]`, `/adhkar/duas`, `/adhkar/tasbeeh` | Daily adhkar hub (Git JSON under `data/adhkar`) |
| `/qibla` | Qibla compass + prayer times (separate from adhkar) |
| `/resources`, `/qiraat` | Hubs / placeholders |
| `/hadith`, `/heritage` | **Placeholders only** — do not build full pipelines yet |
| `/studio` | Ayah video studio (browser WebCodecs) |
| `/studio/ai` | Independent AI short-video UI; Python engine in `services/money-printer-turbo` |
| `/api/tafsir/...`, `/api/translation/...`, `/api/search`, `/api/study` | Local JSON APIs |

Study UI: `MushafPageStudio` + `StudyModeTabs` (keyboard-accessible RTL tabs) + `WordStudyDock` (morph/syntax/semantics/…). Do **not** show per-layer “المصدر: …” attribution chips in the dock (removed by product decision); keep footer/about GPL credit where legally needed.

### Gotcha: Sync Worker must stay standalone
Never add `"arabya-web": "file:../.."` to `workers/arabya-sync/package.json`. npm creates a junction back to the repo root and Turbopack then fails `next build` with an infinite symlink loop. If that junction reappears, delete `workers/arabya-sync/node_modules/arabya-web` (or reinstall the worker deps without the file dependency).

### Gotcha: do not run `next build` while `next dev` is running
Both share `.next`. A concurrent build causes `Internal Server Error` with `ENOENT ... _buildManifest.js.tmp`. Fix: stop all `next` processes, `rm -rf .next`, restart `npm run dev`.

### npm audit / postcss
Next 15.5.x (and stable 16.2.x) still vendors `postcss@8.4.31` (GHSA-qx2v-qp2m-jg93). Vercel notes this is **not exploitable** for normal Next apps (PostCSS runs at build time). Do **not** run `npm audit fix --force` (downgrades Next to v9).

This repo uses `"overrides": { "postcss": "^8.5.10" }` to silence the advisory safely until a stable Next release ships the bump (landed on canary `16.3.0-canary.6+` only so far). After upgrading Next past that line, the override can be removed if nested postcss is already ≥ 8.5.10.

### Sanity check
Open `/mushaf/1`, select a word, switch study tabs (الكلمات / الإعراب / تفاسير), confirm dock layers load. Run `npm run test` (Vitest) before merging.

### Irab books
`/books` and `import-irab-book` are ready for owner-supplied files and for import/scraping pipelines when the owner directs. Catalog entries may stay `awaiting` until content is imported.
