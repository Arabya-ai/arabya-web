# Lughawi NLP Sidecar (Contabo)

Python NLP runs **outside** the Next.js bundle on Contabo and talks to لغوي over
HTTP localhost. This is the **foundation** stack for Arabic proofreading.

## Foundation layers

| Layer | Tech | Role |
|-------|------|------|
| Rule-based NLP | **PyArabic** + **Stanford Stanza** + builtin MSA pairs | Fast spelling / punctuation / high-precision fixes |
| Morphology | **CAMeL Tools** | POS / lemma / morph analysis |
| Neural GEC (optional) | **AraBART** (`CAMeL-Lab/arabart-qalb14-gec-ged-13`) | Contextual grammar when RAM allows |
| Local LLM (optional) | **Ollama `llama3.1:8b`** (or Mistral 7B) | Rewrite + hard contextual fixes via Auto pool |
| Cloud Auto | Gemini Flash (newest) … | Enrichment when keys exist |

AraNLP is not used (less maintained); Stanza covers the Stanford rule-NLP role.

## Install on Contabo

```bash
cd /var/www/arabya-web
git pull --ff-only origin main
bash scripts/contabo-lughawi-sidecar-deps.sh
# Optional neural GEC (heavy):
#   LUGHAWI_INSTALL_GEC=1 bash scripts/contabo-lughawi-sidecar-deps.sh
bash scripts/contabo-lughawi-sidecar.sh

# Local Llama 3.1 8B (needs ~10GB free RAM):
LUGHAWI_OLLAMA_MODEL=llama3.1:8b bash scripts/contabo-ollama-setup.sh

# .env
echo 'LUGHAWI_SIDECAR_URL=http://127.0.0.1:8091' >> .env
# if Ollama installed:
# LUGHAWI_OLLAMA_BASE_URL=http://127.0.0.1:11434/v1
# LUGHAWI_OLLAMA_MODEL=llama3.1:8b

pm2 restart arabya-web --update-env
```

## Endpoints

| Method | Path | Role |
|--------|------|------|
| GET | `/health` | Liveness + capability map for `/admin/ops` |
| POST | `/morph` | CAMeL when installed; else heuristic |
| POST | `/rules-nlp` | PyArabic + Stanza + builtin pairs |
| POST | `/gec` | rules-nlp + optional AraBART |
| POST | `/tashkeel` | CATT when installed; else passthrough |

## Proofread path (Next.js)

1. Offline TypeScript rules (`proofreadLocal`)
2. Sidecar `/gec` (`enrichProofreadWithSidecar`)
3. Auto LLM pool — Gemini / Groq / **Ollama Llama-3.1-8B** (`enrichProofreadWithAi`)

## Status

v0.3.0 wires the foundation APIs. Contabo must run `contabo-lughawi-sidecar-deps.sh`
once so Stanza/CAMeL packages and models land on disk.
