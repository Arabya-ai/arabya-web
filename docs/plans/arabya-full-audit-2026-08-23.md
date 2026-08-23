# Arabya full-stack audit — 2026-08-23

**Method:** Matt Pocock skills (`improve-codebase-architecture`, `codebase-design`, `code-review`) + existing Arabya ecosystem skills (`arabya-agent-ecosystem`, Speckit, Contabo rules).  
**Baseline:** `main` @ `0e60926` (PR #205 L5 Mastermind merged). Deploy Contabo in progress at audit time (site 503 during publish — expected).

---

## Executive verdict

Arabya is a **large, Contabo-centered** Next.js + FastAPI product. Guest mushaf reading and local Lughawi rules are solid. The densest risk is the **Lughawi multi-tier stack** (TS rules ∥ sidecar ∥ arabya-nlp ∥ MoA ∥ Ollama ∥ Mastermind) after rapid L0–L5 shipping. Agent tooling is now rich (10 vendored repos + Matt Pocock skills). Highest leverage next: **observability + safer deploy defaults + deepen the proofread seam**.

---

## 1. Inventory (what exists)

| Layer | Stack |
|-------|--------|
| Frontend | Next 15 App Router, React 19, Tailwind 4, next-intl (ar default / en), TipTap Lughawi |
| Backend | Next Route Handlers (`/api/*` ~61), Auth.js Google OAuth |
| Internal | `arabya-nlp` :8092, sidecar :8091, Ollama :11434, PM2 |
| Data | Git JSON `/data` + Contabo SQLite `/var/lib/arabya` |
| External | Google Gemini, HF Inference (MoA), Sentry, ServerAvatar |
| Agents | `.agents/skills` + `.cursor/skills` + `vendor/agent-ecosystem` + `skills-lock.json` (Matt Pocock) |

---

## 2. Module depth map (codebase-design vocabulary)

### Deep modules (keep)

| Module | Why deep |
|--------|----------|
| Git-first content under `/data` | Huge behaviour (Quran/hadith/heritage) behind simple file reads |
| `scripts/contabo-ensure-dbs.sh` | One interface creates all runtime SQLite paths |
| Offline TS proofread rules | Guests always get a result without cloud |

### Shallow / friction candidates (top recommendations)

| # | Candidate | Strength | Files |
|---|-----------|----------|--------|
| 1 | **Deepen proofread orchestration** | Strong | `src/app/api/lughawi/proofread/route.ts` + enrich clients + NLP `proofreader.py` |
| 2 | **Split `local-user-db`** | Strong | CRM / sync / studio / appearance god module |
| 3 | **Unify AI key resolution** | Strong | `ai-gateway` + `resolve-ai` + admin pool + credentials |
| 4 | **Collapse cloud-sync dual backend** | Worth exploring | Contabo SQLite vs D1 worker façade |
| 5 | **Auth/role verification chain** | Worth exploring | JWT ↔ DB ↔ `roleUnverified` 503 |
| 6 | **Expose MoA proposer telemetry** | Strong | `moa_stage.proposer_engines` never reaches UI |
| 7 | **Studio path split** | Speculative | `ayat-studio` vs `/studio` routes vs APIs |
| 8 | **Deploy script as library** | Speculative | `contabo-deploy.sh` knowledge not reusable |

Deletion test highlights: removing `proofread/route.ts` orchestration would scatter complexity across every caller — it earns keep, but its **interface is too large** (env flags × services × auth). Prefer a single deep `runProofread(request)` module with one options type.

---

## 3. Frontend audit

**Strengths**
- RTL + teal brand tokens consistent on core surfaces
- Mushaf study tabs accessible; Lughawi TipTap underlines (L1)
- Guest reading not gated

**Risks / debt**
- Lughawi chrome shows many layers; no clear «تدقيق عميق» button (MoA silent on every signed-in proofread)
- CSP allows `'unsafe-inline'` scripts (Contabo tradeoff)
- Leftover CF/Render docs can confuse owners

**Routes coverage (smoke priorities):** `/`, `/mushaf/1`, `/lughawi`, `/hadith`, `/heritage`, `/adhkar`, `/admin/ops`, `/studio`, `/account`, `/login`

---

## 4. Backend / API audit

**Families:** auth, lughawi, account, admin, content (tafsir/translation/search/study/hadith), studio/create, sync.

**Gaps**
- Almost no `route.test.ts` for `/api/lughawi/proofread` or admin APIs
- In-memory rate limit assumes single PM2 instance
- Elevated JWT without re-verify → 503 (`roleUnverified`) — correct but opaque to owner

---

## 5. External & internal services

| Service | Status | Note |
|---------|--------|------|
| Contabo PM2 | Deploying #205 | 503 during deploy is normal |
| arabya-nlp | Activated by workflow | Mastermind/shadow/MoA flags seeded |
| Sidecar | Parallel rules | Neural GEC deploy-default ON (RAM risk) |
| Ollama | Deploy-default ON | 12s timeout; skip if RAM ≥ 88% |
| HF MoA | Needs signed-in + token | Llama license may soft-fail one proposer |
| Google Auto | Pool in admin | 503 rotation exists; model list mainly on 404 |
| Sentry | Ops tab | Useful for post-deploy errors |
| Cloudflare sync | Legacy | Not Contabo account path |

---

## 6. Lughawi L5 correctness (post-audit fixes)

| Issue | Severity | Action |
|-------|----------|--------|
| Shadow cache overwritten by rules-only apply | High | **Fixed** in this PR |
| Proposer engines not in API/UI | Medium | Tracked — add `moa_proposers` field next |
| Deploy enables neural+Ollama+MoA together | Medium | Documented; Mastermind mitigates Ollama only |
| MoA on every signed-in proofread | Product gap vs plan | Decide: dedicated deep button vs keep |
| Plan doc still marks L3–L5 🚧 | Docs | Update when deploying settles |

---

## 7. Security & ops

- Secrets: Contabo `.env` + encrypted admin pool; never commit tokens
- Ports 8091/8092/11434 must stay loopback
- DevOps auto-execute forced off in deploy
- CSP XSS tradeoff documented
- Heavy flags on by default after #205 — watch Contabo RAM after publish

---

## 8. Agent ecosystem (after Matt Pocock merge)

**Installed:** all `mattpocock/skills` into `.agents/skills/` (+ `.cursor/skills` symlinks), lockfile `skills-lock.json`.

**Configured:**
- `docs/agents/{issue-tracker,domain,triage-labels}.md`
- `CONTEXT.md` + `docs/adr/0001`, `0002`
- `AGENTS.md` Agent skills section
- Ecosystem router skill updated

**Prior ecosystem (unchanged):** DeepSeek Harness, Anthropic skills, OpenAI/Claude/Gemini cookbooks, Grok Build, Agents SDK, Google ADK, Cursor cookbook/plugins, Speckit, open-code-review, redesign-existing-projects.

---

## 9. Recommended next tickets (ready-for-agent)

1. Plumb `moa_proposers` + NLP warnings into `/lughawi` layer strip + `/admin/ops`
2. Integration test for proofread route (guest vs signed-in MoA mock)
3. Split `local-user-db` into CRM / sync / studio modules
4. Product decision: MoA only on explicit deep button
5. Revisit deploy defaults for `LUGHAWI_NEURAL_GEC` after RAM baseline on Contabo
6. Update `lughawi-model-plan-ar.md` wave table to ✅ L3–L5

---

## 10. Verification checklist (post-deploy)

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://www.arabya.org/lughawi
curl -sS https://www.arabya.org/api/lughawi/status | jq '.arabyaNlp.health.engines'
curl -sS -X POST https://www.arabya.org/api/lughawi/proofread \
  -H 'Content-Type: application/json' \
  -d '{"text":"ذهبت الى المدرسه","locale":"ar"}' | jq '.meta.stages'
# Signed-in browser F12 → proofread → look for +moa: and +mastermind:
```
