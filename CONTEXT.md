# Arabya — domain glossary (for agents)

Shared language for agents and humans. Prefer these terms over synonyms.

## Product

| Term | Meaning | Avoid |
|------|---------|--------|
| **عربية / Arabya** | The product: word-by-word Arabic text analysis platform (Quran now; Hadith & heritage parallel) | "Quran app only", "mushaf SaaS" |
| **مصحف / Mushaf** | Madinah page reader + word study dock | generic "reader" |
| **لغوي / Lughawi** | MSA Arabic proofreader at `/lughawi` | "Grammarly clone", "chatbot" |
| **نحو / إعراب** | Syntax / iʿrāb analysis layer | "parsing" without Arabic context |
| **صرف** | Morphology layer | — |
| **دلالة** | Semantics layer | — |
| **بلاغة** | Rhetoric layer | — |
| **معجم** | Lexicon layer | — |
| **Claim** | Attributed analysis opinion (ADR claims model) | anonymous assertion |

## Roles & accounts

| Term | Meaning | Avoid |
|------|---------|--------|
| **guest** | Not signed in; mushaf/study stay open | forcing login |
| **member** | Signed-in Google user (legacy DB may say `user`) | — |
| **editor** | Content editing privileges | — |
| **admin / super-admin** | CRM + `/admin/ops`; allowlist `ARABYA_ADMIN_EMAILS` | "root user" |
| **Google OAuth** | Only production sign-in | email/password billing |

## Hosting & ops

| Term | Meaning | Avoid |
|------|---------|--------|
| **Contabo** | Sole production VPS (PM2 + Nginx/OLS via ServerAvatar) | Vercel, Netlify, Render as production |
| **Deploy Contabo** | GitHub Action + `scripts/contabo-deploy.sh` | "ship to Vercel" |
| **arabya-nlp** | FastAPI NLP on `127.0.0.1:8092` | exposing :8092 publicly |
| **sidecar / النحوي** | Lughawi sidecar on `:8091` (rules + optional Alnnahwi GEC) | — |
| **Ollama** | Local LLM on Contabo `:11434` | cloud-only assumption |
| **ServerAvatar** | Contabo panel; enough without Coolify | recommending Coolify as required |

## Lughawi stack

| Term | Meaning | Avoid |
|------|---------|--------|
| **rules / TS rules** | Offline TypeScript proofread foundation | "AI" for local rules |
| **MoA** | Mixture of Agents: Jais + Llama + DeepSeek proposers → Qwen judge (HF) | single-model "deep AI" |
| **Mastermind** | L5 orchestrator: RAM-aware tier plan + shadow cache | unmanaged parallel LLMs |
| **Shadow cache** | SQLite replay of learned corrections | CDN cache |
| **Flywheel** | Crowd accept/reject learning DB | training a new model in-place |
| **Auto pool** | Admin-rotated Google/OpenAI/Ollama keys in `/admin/ops` | BYOK confusion |
| **HF token** | Hugging Face Read token for MoA only | Auto chat rotation |

## Content

| Term | Meaning | Avoid |
|------|---------|--------|
| **Git-first** | Quran/Hadith/heritage/adhkar JSON under `/data` | putting static mushaf in SQLite |
| **Word ID** | Stable word key (Quran / `HW:…` Hadith) | fragile offsets alone |

## Architecture vocabulary (from mattpocock codebase-design)

Use **module**, **interface**, **depth**, **seam**, **adapter**, **leverage**, **locality** when discussing design. Do not substitute "service/API/boundary" for those meanings.
