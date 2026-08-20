# Lughawi NLP Sidecar (Contabo)

Python tools (CAMeL Tools, ARETA, CATT, BAYAN-style pipelines, HF GEC models)
must **not** be imported into the Next.js client/server bundle. They run as a
separate process on Contabo and talk to لغوي over HTTP localhost.

## Planned endpoints

| Method | Path | Role |
|--------|------|------|
| GET | `/health` | Liveness for `/admin/ops` |
| POST | `/morph` | CAMeL Tools analysis |
| POST | `/gec` | CAMeL / text-editing GEC |
| POST | `/areta` | Error type labels for explanations |
| POST | `/tashkeel` | CATT diacritization |

## Env (Next.js)

```bash
LUGHAWI_SIDECAR_URL=http://127.0.0.1:8091
```

## Status

Scaffold only in this release. Install order when the owner approves GPU/CPU budget:

1. CAMeL Tools + ARETA (CPU OK)
2. CATT for tashkeel
3. HF AraBART GEC (prefer GPU)
4. Optional BAYAN components as reference adapters

See `data/ops/integrations-registry.json` and `/admin/ops`.
