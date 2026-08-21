"""Central configuration — Contabo self-hosted only. No cloud DB URLs."""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """All tunables live in `.env` — never hardcode secrets or host paths in code."""

    model_config = SettingsConfigDict(
        env_file=(".env", "../.env", "../../.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        populate_by_name=True,
    )

    # --- Service ---
    app_name: str = "Lughawi"
    app_version: str = "1.0.0"
    environment: Literal["development", "production", "test"] = "production"
    # Bind all interfaces so Next.js / reverse proxies can reach :8092.
    # Contabo UFW + ServerAvatar must allow TCP 8092; see docs/platform/arabya-nlp-port-8092-ar.md
    host: str = Field(default="0.0.0.0", alias="ARABYA_NLP_HOST")
    port: int = Field(default=8092, alias="ARABYA_NLP_PORT")
    log_level: str = Field(default="INFO", alias="ARABYA_NLP_LOG_LEVEL")
    server_log_path: str = Field(
        default="/var/log/arabya/arabya-nlp-server.log",
        alias="ARABYA_NLP_SERVER_LOG",
    )
    tmp_dir: str = Field(default="/tmp/arabya-nlp", alias="ARABYA_NLP_TMP_DIR")

    # --- Database (local Contabo SQLite by default; optional local Postgres) ---
    database_url: str = Field(
        default="sqlite:////var/lib/arabya/arabya-nlp.sqlite",
        alias="ARABYA_NLP_DATABASE_URL",
    )

    # --- Ollama (local only) ---
    ollama_base_url: str = Field(
        default="http://127.0.0.1:11434",
        alias="ARABYA_NLP_OLLAMA_BASE_URL",
    )
    ollama_generate_path: str = "/api/generate"
    ollama_proofread_model: str = Field(
        default="llama3.1:8b",
        alias="ARABYA_NLP_OLLAMA_MODEL",
    )
    ollama_devops_model: str = Field(
        default="llama3.1:8b",
        alias="ARABYA_NLP_OLLAMA_DEVOPS_MODEL",
    )
    ollama_timeout_seconds: float = 120.0
    ollama_devops_timeout_seconds: float = 60.0

    # --- Whisper / FFmpeg ---
    whisper_model_size: str = Field(default="medium", alias="ARABYA_NLP_WHISPER_SIZE")
    whisper_device: str = Field(default="cpu", alias="ARABYA_NLP_WHISPER_DEVICE")
    whisper_compute_type: str = Field(default="int8", alias="ARABYA_NLP_WHISPER_COMPUTE")
    whisper_language: str = "ar"
    ffmpeg_binary: str = Field(default="ffmpeg", alias="ARABYA_NLP_FFMPEG")
    max_upload_bytes: int = Field(default=25_000_000, alias="ARABYA_NLP_MAX_UPLOAD_BYTES")

    # --- Rate limiting (external guests only; loopback/Next is exempt) ---
    rate_limit_enabled: bool = True
    # Generous guest ceiling — loopback Contabo→NLP is never limited.
    # Was 5 then 120/hour; keep huge so public traffic never false-429s.
    rate_limit_requests: int = Field(default=100_000, alias="ARABYA_NLP_RATE_LIMIT_REQUESTS")
    rate_limit_window_seconds: int = Field(
        default=3600,
        alias="ARABYA_NLP_RATE_LIMIT_WINDOW",
    )
    # Bearer tokens that bypass the public guest limiter
    api_tokens: str = Field(default="", alias="ARABYA_NLP_API_TOKENS")

    # --- DevOps agent ---
    devops_agent_enabled: bool = Field(default=True, alias="ARABYA_NLP_DEVOPS_ENABLED")
    devops_agent_interval_seconds: int = Field(
        default=60,
        alias="ARABYA_NLP_DEVOPS_INTERVAL",
    )
    devops_auto_execute: bool = Field(
        default=False,
        alias="ARABYA_NLP_DEVOPS_AUTO_EXECUTE",
    )
    cpu_alert_percent: float = 92.0
    ram_alert_percent: float = 92.0
    disk_alert_percent: float = 90.0

    # --- Dashboard ---
    dashboard_enabled: bool = True
    streamlit_port: int = Field(default=8501, alias="ARABYA_NLP_STREAMLIT_PORT")

    # --- Proofreader ---
    preserve_diacritics_default: bool = True
    # Local Ollama (llama 8B) is optional — OFF by default on Contabo RAM budgets.
    # Rules (PyArabic/ghalatawi) stay always-on. Set ARABYA_NLP_LLM_PROOFREAD=1 to enable.
    llm_proofread_enabled: bool = Field(default=False, alias="ARABYA_NLP_LLM_PROOFREAD")

    @field_validator("database_url")
    @classmethod
    def reject_cloud_databases(cls, value: str) -> str:
        lowered = value.lower()
        forbidden = ("supabase", "neon.tech", "planetscale", "turso.io", "vercel")
        for needle in forbidden:
            if needle in lowered:
                raise ValueError(
                    f"Cloud database URLs are forbidden ({needle}). "
                    "Use local SQLite or local PostgreSQL on Contabo only."
                )
        return value

    @property
    def ollama_generate_url(self) -> str:
        return self.ollama_base_url.rstrip("/") + self.ollama_generate_path

    @property
    def ollama_tags_url(self) -> str:
        return self.ollama_base_url.rstrip("/") + "/api/tags"

    @property
    def api_token_set(self) -> set[str]:
        return {t.strip() for t in self.api_tokens.split(",") if t.strip()}

    def ensure_runtime_dirs(self) -> None:
        Path(self.tmp_dir).mkdir(parents=True, exist_ok=True)
        log_parent = Path(self.server_log_path).parent
        try:
            log_parent.mkdir(parents=True, exist_ok=True)
        except OSError:
            # Dev / CI without /var/log — fall back under tmp
            fallback = Path(self.tmp_dir) / "logs"
            fallback.mkdir(parents=True, exist_ok=True)
            object.__setattr__(self, "server_log_path", str(fallback / "arabya-nlp-server.log"))
        db_url = self.database_url
        if db_url.startswith("sqlite:///"):
            raw = db_url.replace("sqlite:///", "", 1)
            # Absolute path form sqlite:////var/... → /var/...
            if raw.startswith("/"):
                Path(raw).parent.mkdir(parents=True, exist_ok=True)


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_runtime_dirs()
    return settings
