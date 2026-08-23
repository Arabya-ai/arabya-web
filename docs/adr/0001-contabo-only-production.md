# ADR-0001: Contabo-only production

## Status

Accepted

## Context

Arabya previously explored Cloudflare Workers / D1 and had leftover Vercel GitHub checks. Owner operates a Contabo VPS with ServerAvatar (PM2 + Nginx).

## Decision

- Production host is **Contabo only**.
- Ship path: merge `main` → **CI** → **Deploy Contabo** (`scripts/contabo-deploy.sh`).
- Account/runtime DBs: SQLite under `/var/lib/arabya` via `contabo-ensure-dbs.sh`.
- Do not treat red Vercel checks as product failure.

## Consequences

- Agents must never ask the owner to deploy or debug on Vercel.
- Cloudflare `arabya-sync` is legacy/optional; Contabo SQLite is the account path.
