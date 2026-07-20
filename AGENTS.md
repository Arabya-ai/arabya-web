# AGENTS.md

## Cursor Cloud specific instructions

`arabya-web` is a single, self-contained Next.js 15 (App Router, Turbopack) + React 19 + TypeScript + Tailwind 4 app. Package manager is **npm** (`package-lock.json`). There is **no database, no `.env`, and no required environment variables** — all content ships as static JSON committed under `/data`, read at runtime by `src/lib/quran.ts` and the `/api/tafsir/[slug]/[surahId]` route.

Standard commands are in `package.json` (`dev`, `build`, `start`, `lint`). Notes:
- Dev server: `npm run dev` serves the whole product (pages + the local-JSON-backed API) at `http://localhost:3000`. This is the only service needed to test end to end.
- `npm run lint` currently reports one pre-existing warning (unused `readdir` in `scripts/build-mushaf-index.mjs`) and 0 errors.
- The `npm run fetch-data` / `fetch-tafsirs` / `build-irab` / `apply-qpc-text` / `build-mushaf-index` scripts are **data-prep only** (they hit the external Quran.com API / process the Quranic Arabic Corpus). They are NOT needed to run or test the app since `/data` is already committed; only run them to regenerate bundled data.
- Core flow to sanity-check: open `/mushaf/1`, click words for translations, and switch the الإعراب (i'rab) and تفسير السعدي (tafsir) tabs to confirm study panels load.

### Gotcha: do not run `next build` while `next dev` is running
`next dev` (Turbopack) and `next build` share the same `.next` directory. Running `npm run build` (or `npm run start`, which serves `.next`) while `npm run dev` is live clobbers the dev server's artifacts and makes it throw `Internal Server Error` on every route, with `ENOENT ... .next/static/development/_buildManifest.js.tmp` in the logs. If this happens, stop all `next` processes, delete `.next` (`rm -rf .next`), and restart `npm run dev`. To build/test a production bundle, stop the dev server first (or build into a separate checkout).
