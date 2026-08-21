# Arabya NLP Platform (Contabo self-hosted)

Production-ready FastAPI service for Arabic NLP on a **single Contabo VPS**.
No Vercel, no Supabase, no managed cloud databases.

## Architecture (4 layers)

| Layer | Path | Role |
|-------|------|------|
| 1 | `app/pipeline/proofreader.py` | PyArabic + Ghalatawi → local Ollama grammar JSON |
| 2 | `app/services/audio_processor.py` | FFmpeg → 16 kHz WAV → faster-whisper → Layer 1 |
| 3 | `app/agent/devops_agent.py` | 60s health loop + whitelist self-healing |
| 4 | `/dashboard` (+ optional Streamlit) | Live metrics, agent audit, linguistic analytics |

## Contabo install

```bash
cd /var/www/arabya-web
bash scripts/contabo-arabya-nlp-deps.sh
# Ensure Ollama is up (existing helper):
bash scripts/contabo-ollama-setup.sh   # if present
ollama pull llama3.1:8b

curl -s http://127.0.0.1:8092/health | python3 -m json.tool
curl -s http://127.0.0.1:8092/dashboard
```

PM2 process name: `arabya-nlp` (localhost `127.0.0.1:8092`).

## Security

- **Command sandbox**: DevOps agent never runs free-form LLM shell. It maps to
  hardcoded keys in `app/security/command_sandbox.py` (`SAFE_ACTIONS`).
- **Auto-execute off by default** (`ARABYA_NLP_DEVOPS_AUTO_EXECUTE=0`) — diagnose +
  audit only until you explicitly enable execution.
- **Guest rate limit**: 5 requests / hour / IP (`ARABYA_NLP_RATE_LIMIT_*`).
  Trusted callers send `Authorization: Bearer <token>` from `ARABYA_NLP_API_TOKENS`.
- **DB**: local SQLite under `/var/lib/arabya/` (or local Postgres). Cloud URL
  hostnames are rejected by config validation.

## API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | CPU/RAM/disk + component green/red |
| POST | `/v1/proofread` | `{ "text": "...", "preserve_diacritics": true }` |
| POST | `/v1/transcribe` | multipart `file` (mp4/mov/mp3/wav/m4a) |
| GET | `/v1/analytics` | words, audio minutes, top errors, agent log |
| GET | `/dashboard` | built-in RTL admin UI |
| POST | `/v1/agent/tick` | force one DevOps cycle |

## Local dev

```bash
cd services/arabya-nlp
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export ARABYA_NLP_DATABASE_URL=sqlite:////tmp/arabya-nlp-dev.sqlite
export ARABYA_NLP_SERVER_LOG=/tmp/arabya-nlp/server.log
export ARABYA_NLP_TMP_DIR=/tmp/arabya-nlp
export ARABYA_NLP_DEVOPS_ENABLED=0
export ARABYA_NLP_LLM_PROOFREAD=0
python main.py
```

## Relation to `lughawi-sidecar`

`services/lughawi-sidecar` remains the lightweight Next.js enrichment process on
port **8091**. This platform (`arabya-nlp`, port **8092**) is the enterprise
FastAPI stack (DB, DevOps agent, dashboard, hybrid Ollama proofread, media STT).
Both are Contabo-local and may run side-by-side.

## Optional Streamlit

```bash
ARABYA_NLP_DASHBOARD_API=http://127.0.0.1:8092 \
  streamlit run app/dashboard/streamlit_app.py \
  --server.address 127.0.0.1 --server.port 8501
```
