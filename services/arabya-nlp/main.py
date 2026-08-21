"""
Arabya Lughawi engine — Contabo self-hosted FastAPI entrypoint.

Layers:
  1) Hybrid proofreader (PyArabic/Ghalatawi → local Ollama)
  2) Audio/video STT (FFmpeg → faster-whisper → Layer 1)
  3) DevOps self-healing agent (whitelist sandbox)
  4) Management dashboard (/dashboard)
"""

from __future__ import annotations

import logging
import sys
from contextlib import asynccontextmanager
from pathlib import Path

# Allow `python main.py` from services/arabya-nlp
ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.agent.devops_agent import agent_singleton
from app.api.routes import router
from app.database import init_db
from config import get_settings

settings = get_settings()

# File + stderr logging for DevOps agent log-tail analysis
Path(settings.server_log_path).parent.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    handlers=[
        logging.StreamHandler(sys.stderr),
        logging.FileHandler(settings.server_log_path, encoding="utf-8"),
    ],
)
logger = logging.getLogger("arabya_nlp")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    settings.ensure_runtime_dirs()
    init_db()
    agent_singleton.start()
    logger.info(
        "arabya-nlp %s listening intent %s:%s (db=%s)",
        settings.app_version,
        settings.host,
        settings.port,
        settings.database_url.split("://")[0],
    )
    try:
        yield
    finally:
        agent_singleton.stop()
        logger.info("arabya-nlp shutdown")


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description=(
        "100% Contabo self-hosted Arabic NLP: proofreading, Whisper STT, "
        "DevOps agent, analytics dashboard. No Vercel/Supabase."
    ),
    lifespan=lifespan,
)

# Local Contabo / reverse-proxy only — do not open wild CORS in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "https://www.arabya.org",
        "https://arabya.org",
        "https://www.arabyaai.com",
        "https://arabyaai.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


def main() -> None:
    import uvicorn

    # Explicit bind: 0.0.0.0 (not 127.0.0.1) so Contabo/Next can reach :8092
    # when UFW + ServerAvatar inbound rules allow TCP 8092.
    uvicorn.run(
        "main:app",
        host=settings.host or "0.0.0.0",
        port=settings.port,
        reload=False,
        log_level=settings.log_level.lower(),
    )


if __name__ == "__main__":
    main()
