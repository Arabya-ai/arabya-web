# AGENTS.md

## Cursor Cloud specific instructions

`arabya-web` is a single, self-contained Next.js 15 (App Router, Turbopack) + React 19 + TypeScript + Tailwind 4 app. Package manager is **npm** (`package-lock.json`). There is **no database, no `.env`, and no required environment variables** — all content ships as static JSON committed under `/data`, read at runtime by `src/lib/quran.ts` and the `/api/tafsir/[slug]/[surahId]` route.

Standard commands are in `package.json` (`dev`, `build`, `start`, `lint`). Notes:
- Dev server: `npm run dev` serves the whole product (pages + the local-JSON-backed API) at `http://localhost:3000`. This is the only service needed to test end to end.
- `npm run lint` currently reports one pre-existing warning (unused `readdir` in `scripts/build-mushaf-index.mjs`) and 0 errors.
- The `npm run fetch-data` / `fetch-tafsirs` / `build-irab` / `apply-qpc-text` / `build-mushaf-index` scripts are **data-prep only** (they hit the external Quran.com API / process the Quranic Arabic Corpus). They are NOT needed to run or test the app since `/data` is already committed; only run them to regenerate bundled data.
- Core flow to sanity-check: open `/mushaf/1`, click words for translations, and switch the الإعراب (i'rab) and تفسير السعدي (tafsir) tabs to confirm study panels load.
