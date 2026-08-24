# arabya-sync (Cloudflare Worker)

Optional/legacy user-data sync (D1). **Production account sync = Contabo SQLite.**

## Workers Builds (dashboard)

| Field | Value |
|-------|--------|
| Root directory | `workers/arabya-sync` |
| Build command | *(empty)* |
| Deploy command | `npx wrangler deploy` |
| Production branch | `main` |
| Watch paths | `workers/arabya-sync/**` |

If Root directory is empty, Cloudflare runs `npm ci` on the **Next.js repo root** and fails with missing `@next/swc-*` optional lockfile entries. See `docs/platform/cloudflare-arabya-sync-builds-ar.md`.

## Local

```bash
cd workers/arabya-sync
npm ci
npx wrangler deploy
```
