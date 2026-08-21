# Route & API Inventory — Wave 1

Last updated: 2026-08-20

## Frontend route groups (covered)
- Public Quran core: `/`, `/mushaf/[page]`, `/surah/[id]`, `/surah/[id]/read`, `/ayah/[surah]/[verse]`
- Study/search/navigation: `/study`, `/juz`, `/roots`, `/root/[root]`
- Devotional tools: `/adhkar`, `/adhkar/[slug]`, `/adhkar/duas`, `/adhkar/tasbeeh`, `/qibla`, `/asma`, `/asma/[n]`
- Studio: `/studio`, `/studio/(shell)/*` (ayah editor; AI MPT path removed)
- Create legacy redirects: `/create`, `/create/image`, `/create/video`
- Auth/account: `/login`, `/account/*`, `/favorites`
- Admin: `/admin`, `/admin/users`, `/admin/requests`, `/admin/audit`, `/admin/settings`, `/admin/tahfeez`
- Content hubs: `/books`, `/books/[slug]`, `/resources`, `/qiraat`, `/hadith`, `/heritage`, `/about`, `/contact`, `/privacy`, `/terms`, `/pricing`, `/library`

## API groups (covered)
- Quran content: `/api/search`, `/api/study`, `/api/tafsir/...`, `/api/translation/...`, `/api/mushaf/...`
- Hadith: `/api/hadith/search`, `/api/hadith/word-enrich`, `/api/hadith/remote-enrich`
- Devotional: `/api/qibla`, `/api/prayer-times`
- Account/sync/roles: `/api/sync`, `/api/account/role-request`
- Tahfeez: `/api/tahfeez/check`, `/api/tahfeez/portfolio`
- Studio/editorial: `/api/studio/*`, `/api/editor/adhkar-content`
- Admin: `/api/admin/stats`, `/api/admin/users`, `/api/admin/requests`, `/api/admin/audit`, `/api/admin/appearance`, `/api/admin/prayer-settings`, `/api/admin/tahfeez`
- Auth/system: `/api/auth/[...nextauth]`, `/api/site-appearance`, `/api/og`
- Remote proxies: `/api/remote/siyar`

## Auth/access model summary
- Guest: most Quran/content routes and read-only APIs.
- Auth required: account, favorites, create flows, studio shell, tahfeez, sync, tahfeez APIs.
- Editor/Admin: editorial tools (`/account/edit/*`, `/api/editor/adhkar-content`, `/api/studio/uploads`, `/api/studio/quality-scan`).
- Admin only: `/admin/*`, `/api/admin/*`.

## Hub status (2026-08-20)
- **Live:** `/hadith` (full Arabic corpora + word enrich), `/heritage` (passages catalog), `/adhkar`, `/qibla`, `/asma`, `/library`, `/resources`, `/qiraat` (Hafs ready).
- **Awaiting licensed import:** some `/books` catalog rows; non-Hafs qiraʾat.
- Nav/footer must keep `/resources`, `/books`, `/qiraat` discoverable.

## Notes
- Locale routing is `as-needed` (Arabic default, English via `/en` prefix).
- Inventory is used as baseline for functional/security/design audits in other files.
- Prayer/qibla coords accept `lat`/`lon` and aliases `latitude`/`longitude`/`lng`.
