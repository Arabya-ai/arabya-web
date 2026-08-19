# Functional Matrix — Wave 1

Last updated: 2026-08-19

## Coverage axes
- Routes: public, account, admin, studio, tahfeez, devotional.
- Roles: guest, member, editor, admin.
- API states: success, validation error, upstream error, auth error.
- UI states: loading, empty, error, success.

## Module matrix (summary)

| Module | Core flows validated in Wave 1 | Key risk area |
|---|---|---|
| Mushaf/Study/Ayah | Open page, load study layers, navigate ayah/root, read i'rab | Large component orchestration regressions |
| Search/Root/Juz | Query search, open root result, browse juz mapping | Ranking/recall drift with normalization changes |
| Tafsir/Translation | Fetch allowed source, fallback handling, payload clipping | Source index drift / truncation semantics |
| Adhkar/Duas/Tasbeeh | Browse categories, filter duas, count/reset tasbeeh | Persisted local-state migrations |
| Qibla/Prayer | City mode + coordinate mode + place label + fallback | Upstream geocode/prayer service latency |
| Account | Session-required dashboard pages and widgets | Multi-subsystem dependency failures |
| Admin | Users/requests/audit/settings guarded access | Sync outages and role-source mismatch |
| Tahfeez | Audio + speech + alignment + session persistence | Browser speech lifecycle variability |
| Studio | Project/editor/settings navigation and media endpoints | Cross-surface design + heavy export paths |
| Studio AI | health/tasks/create/files proxy paths | External engine contract changes |

## Priority bug classes to track
1. Auth gate failures / role leakage
2. API payload shape drift
3. Locale mismatch (AR/EN labels from backend payload)
4. Theme token drift between surfaces
5. Long-running client CPU tasks (studio/tahfeez)

## Execution note
Detailed per-route test cases and evidence artifacts (screenshots/videos/logs) are produced in implementation waves, starting with high-risk modules first.
