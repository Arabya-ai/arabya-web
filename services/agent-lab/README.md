# Arabya Agent Lab (optional)

Python sandbox for experimenting with **OpenAI Agents SDK** and **Google ADK** against vendored upstream repos. Not deployed to production PM2 unless the owner approves.

## Setup

```bash
bash scripts/install-agent-ecosystem.sh
# or only venv:
bash services/agent-lab/setup-venv.sh
source services/agent-lab/.venv/bin/activate
```

## Vendored SDK paths

| SDK | Submodule |
|-----|-----------|
| OpenAI Agents | `vendor/agent-ecosystem/openai-agents-python/` |
| Google ADK | `vendor/agent-ecosystem/google-adk-python/` |

## Example runs

```bash
cd services/agent-lab
source .venv/bin/activate
python run_openai_agents_demo.py   # handoff demo (needs OPENAI_API_KEY)
python run_adk_demo.py             # ADK hello-world (needs GOOGLE_API_KEY)
```

Keys are **optional** for the main Next.js app. Use admin/ops or local `.env` for lab only.

## Production path

Winning patterns graduate to `services/arabya-nlp/` (FastAPI on Contabo `:8092`), respecting Lughawi Contabo-first rules.
