# Route & API Inventory — Wave 1

Last updated: 2026-08-19

## Frontend route groups (covered)
- Public Quran core: `/`, `/mushaf/[page]`, `/surah/[id]`, `/surah/[id]/read`, `/ayah/[surah]/[verse]`
- Study/search/navigation: `/study`, `/juz`, `/roots`, `/root/[root]`
- Devotional tools: `/adhkar`, `/adhkar/[slug]`, `/adhkar/duas`, `/adhkar/tasbeeh`, `/qibla`, `/asma`, `/asma/[n]`
- Studio: `/studio`, `/studio/(shell)/*`, `/studio/ai`, `/studio/ai/*`
- Create legacy redirects: `/create`, `/create/image`, `/create/video`
- Auth/account: `/login`, `/account/*`, `/favorites`
- Admin: `/admin`, `/admin/users`, `/admin/requests`, `/admin/audit`, `/admin/settings`, `/admin/tahfeez`
- Content hubs/placeholders: `/books`, `/books/[slug]`, `/resources`, `/qiraat`, `/hadith`, `/heritage`, `/about`, `/contact`, `/privacy`, `/terms`, `/pricing`

## API groups (covered)
- Quran content: `/api/search`, `/api/study`, `/api/tafsir/...`, `/api/translation/...`, `/api/mushaf/...`
- Devotional: `/api/qibla`, `/api/prayer-times`
- Account/sync/roles: `/api/sync`, `/api/account/role-request`
- Tahfeez: `/api/tahfeez/check`, `/api/tahfeez/portfolio`
- Studio/editorial: `/api/studio/*`, `/api/editor/adhkar-content`
- Admin: `/api/admin/stats`, `/api/admin/users`, `/api/admin/requests`, `/api/admin/audit`, `/api/admin/appearance`, `/api/admin/prayer-settings`, `/api/admin/tahfeez`
- Auth/system: `/api/auth/[...nextauth]`, `/api/site-appearance`, `/api/og`

## Auth/access model summary
- Guest: most Quran/content routes and read-only APIs.
- Auth required: account, favorites, create flows, studio shell, tahfeez, sync, tahfeez APIs.
- Editor/Admin: editorial tools (`/account/edit/*`, `/api/editor/adhkar-content`, `/api/studio/uploads`, `/api/studio/quality-scan`).
- Admin only: `/admin/*`, `/api/admin/*`.

## Placeholder status
- Explicit placeholders still present: `/hadith`, `/heritage`.
- Partial placeholder behavior: some books entries remain `awaiting` until import.

## Notes
- Locale routing is `as-needed` (Arabic default, English via `/en` prefix).
- Inventory is used as baseline for functional/security/design audits in other files.
