# Lughawi NLP Sidecar (Contabo)

Python tools (CAMeL Tools, ARETA, CATT, BAYAN-style pipelines, HF GEC models)
must **not** be imported into the Next.js client/server bundle. They run as a
separate process on Contabo and talk to لغوي over HTTP localhost.

## Run

```bash
python3 services/lughawi-sidecar/app.py
# or on Contabo after deploy:
bash scripts/contabo-lughawi-sidecar.sh
```

Default: `http://127.0.0.1:8091`

## Endpoints

| Method | Path | Role |
|--------|------|------|
| GET | `/health` | Liveness for `/admin/ops` (+ tool capability map) |
| POST | `/morph` | CAMeL when installed; else honest heuristic tokens |
| POST | `/tashkeel` | CATT when installed; else passthrough + warning |
| POST | `/gec` | Stub until HF GEC weights are loaded |

## Env (Next.js)

```bash
LUGHAWI_SIDECAR_URL=http://127.0.0.1:8091
```

## Status

v0.1.0 ships real HTTP endpoints with lightweight fallbacks. Install order when
the owner approves CPU/GPU budget:

1. CAMeL Tools + ARETA (CPU OK)
2. CATT for tashkeel
3. HF AraBART GEC (prefer GPU)
4. Optional BAYAN components as reference adapters

See `data/ops/integrations-registry.json` and `/admin/ops`.

Legacy: `health_stub.py` kept for reference; prefer `app.py`.
