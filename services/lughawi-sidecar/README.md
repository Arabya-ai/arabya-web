# Lughawi NLP Sidecar (Contabo)

Python NLP runs **outside** Next.js on Contabo (`127.0.0.1:8091`).

## Why Hugging Face (not “upload our whole project”)?

We do **not** host Arabya’s app on Hugging Face. We **call existing HF models via Inference API** when `LUGHAWI_HF_TOKEN` is set:

| Task | Model | Where it runs |
|------|--------|----------------|
| Arabic GEC | `alnnahwi/gemma-3-1b-arabic-gec-v1` | HF remote (preferred) |
| Speech→text | `openai/whisper-large-v3` | HF remote (preferred) |
| Rule NLP | PyArabic, Ghalatawi, Fareh, Stanza, CAMeL | Contabo sidecar (light CPU) |
| Local LLM fallback | Ollama `llama3.1:8b` | Contabo (optional, heavy RAM) |

This is intentional: light rules stay local; heavy neural work prefers HF to save Contabo RAM/CPU.

## Install

```bash
cd /var/www/arabya-web
bash scripts/contabo-lughawi-sidecar-deps.sh
# Add free token from https://huggingface.co/settings/tokens
# echo 'LUGHAWI_HF_TOKEN=hf_...' >> .env
pm2 restart lughawi-sidecar arabya-web --update-env
curl -s http://127.0.0.1:8091/health | python3 -m json.tool
```

Ensure `.env` also has:

```bash
LUGHAWI_SIDECAR_URL=http://127.0.0.1:8091
```

## Endpoints

| Method | Path | Role |
|--------|------|------|
| GET | `/health` | Capability map |
| POST | `/morph` | CAMeL morph |
| POST | `/rules-nlp` | Fareh + Ghalatawi + Stanza + builtin |
| POST | `/gec` | rules-nlp + Alnnahwi (HF) |
| POST | `/tashkeel` | CATT or passthrough |
| POST | `/transcribe` | Whisper via HF (`audioBase64`) |

## Proofread path

1. TypeScript rules  
2. Sidecar `/gec` (Fareh/Ghalatawi/Stanza + Alnnahwi)  
3. Auto LLM pool (Gemini / Groq / Ollama)

## Refs

See `data/lughawi/refs/arabic-tech-curriculum-and-stack.md`.
