# Audit remediation notes (P0 / P1)

Date: 2026-08-14 · Contabo production (`www.arabya.org` + `www.arabyaai.com`).

## Closed in code

| ID | Fix |
|----|-----|
| **P0-1** | HMAC actor ticket (`X-Arabya-Actor`). Worker binds `actorEmail`/`email` from ticket `sub`; ignores body spoofing / `ensureAdmin`. |
| **P0-2** | Production remains **Contabo SQLite** (`ARABYA_USER_SYNC_ENABLED=1`) — not serverless. Worker/D1 is legacy. No migration to Neon. |
| **P1-2** | Rate limiter **fail-closed** (503) when in-memory map is saturated. |
| **P1-3** | Prayer/qibla: invalid `city` or `lat`/`lon` → **400** (`invalid_city` / `invalid_coordinates`). No silent Cairo. |
| **P1-4** | Study API labeled `mode: local-retrieval` / `assistant: local` (not an LLM fatwa). |
| **P1-5** | Search `all=1` cap lowered **5000 → 200**. |
| **P1-6** | Pexels/Pixabay: **server env keys only**; media URL helper rejects IP/private hosts. |
| **P1-7** | Elevated role + unreachable sync → `roleUnverified`; admin/studio APIs return **503**. |

## Intentionally deferred (avoid collateral risk)

| Item | Why |
|------|-----|
| Next.js 16 / `npm audit fix --force` | Breaking major; AGENTS.md forbids force. `postcss` already overridden. Safe `nanoid` bump applied if available. |
| Distributed Redis rate limit | Contabo is single PM2 instance today; Map + fail-closed is enough. |
| Full LLM study wiring | Product decision; local retrieval is correct until owner enables a provider. |
| Replacing SQLite with Postgres | Contabo disk SQLite is the chosen durable store. |

## Deploy

```bash
cd /var/www/arabya-web && bash scripts/contabo-deploy.sh
# If Worker/D1 still used anywhere: redeploy workers/arabya-sync after pull
```
