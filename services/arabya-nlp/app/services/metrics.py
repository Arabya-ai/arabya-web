"""Hardware / service health helpers for Layer 4 dashboard."""

from __future__ import annotations

from typing import Any

import psutil

from app.agent.devops_agent import agent_singleton
from app.pipeline.optional_engines import engines_snapshot
from app.services.ollama_client import OllamaClient
from app.schemas import HealthComponent, HealthResponse
from config import get_settings


def collect_health() -> HealthResponse:
    settings = get_settings()
    cpu = float(psutil.cpu_percent(interval=0.1))
    ram = float(psutil.virtual_memory().percent)
    disk = float(psutil.disk_usage("/").percent)
    ollama_up = OllamaClient(settings).is_up_sync()
    agent_status = agent_singleton.status
    engines = engines_snapshot()

    def eng(name: str) -> HealthComponent:
        on = bool(engines.get(name))
        return HealthComponent(
            name=name,
            status="green" if on else "yellow",
            detail="installed" if on else "optional — not installed (offline rules still work)",
        )

    components = [
        HealthComponent(name="web_server", status="green", detail="FastAPI process alive"),
        eng("pyarabic"),
        eng("ghalatawi"),
        eng("mishkal"),
        eng("qutrub"),
        HealthComponent(
            name="ollama",
            # Yellow (not red): Ollama is optional — offline PyArabic+rules must stay healthy.
            status="green" if ollama_up else "yellow",
            detail="localhost:11434" if ollama_up else "optional — unreachable (rules-only OK)",
        ),
        HealthComponent(
            name="devops_agent",
            status=agent_status if agent_status in {"green", "red", "yellow"} else "yellow",
            detail=agent_singleton.last_error or ("running" if agent_singleton.running else "stopped"),
        ),
    ]
    # Core service is OK unless FastAPI itself is broken (never red solely for optional engines).
    ok = all(c.status != "red" for c in components)
    return HealthResponse(
        ok=ok,
        service="arabya-nlp",
        version=settings.app_version,
        components=components,
        cpu_percent=cpu,
        ram_percent=ram,
        disk_percent=disk,
        policy={
            "contaboOnly": True,
            "noCloudDatabases": True,
            "rateLimitGuestPerHour": settings.rate_limit_requests,
            "devopsAutoExecute": settings.devops_auto_execute,
            "engines": engines,
            "proofreadMode": {
                "offline": "PyArabic + rules (+ Ghalatawi)",
                "online": "same + Ollama in parallel",
            },
            "noteAr": (
                "الأولوية: PyArabic + قواعد. Ollama اختياري بالتوازي. "
                "mishkal (تشكيل) و qutrub (تصريف) اختياريان خلف API. "
                "المنصة على Contabo فقط — لا Vercel."
            ),
        },
    )


def analytics_payload(db: Any) -> dict[str, Any]:
    from sqlalchemy import func

    from app.models import AgentAuditLog, GrammarErrorStat, ProofreadJob, TranscriptionJob
    from app.schemas import AgentAuditRow

    total_jobs = db.query(func.count(ProofreadJob.id)).scalar() or 0
    total_words = db.query(func.coalesce(func.sum(ProofreadJob.word_count), 0)).scalar() or 0
    total_tx = db.query(func.count(TranscriptionJob.id)).scalar() or 0
    total_secs = db.query(func.coalesce(func.sum(TranscriptionJob.duration_seconds), 0.0)).scalar() or 0.0

    top_errors = (
        db.query(GrammarErrorStat)
        .order_by(GrammarErrorStat.hit_count.desc())
        .limit(20)
        .all()
    )
    recent = (
        db.query(AgentAuditLog)
        .order_by(AgentAuditLog.detected_at.desc())
        .limit(50)
        .all()
    )

    return {
        "total_proofread_jobs": int(total_jobs),
        "total_words_processed": int(total_words),
        "total_transcription_jobs": int(total_tx),
        "total_audio_minutes": round(float(total_secs) / 60.0, 3),
        "top_errors": [
            {
                "error_type": e.error_type,
                "original": e.original,
                "suggestion": e.suggestion,
                "rule_id": e.rule_id,
                "hit_count": e.hit_count,
            }
            for e in top_errors
        ],
        "recent_agent_actions": [
            AgentAuditRow(
                id=r.id,
                detected_at=r.detected_at,
                anomaly_type=r.anomaly_type,
                error_excerpt=r.error_excerpt,
                ai_analysis=r.ai_analysis,
                action_key=r.action_key,
                command_executed=r.command_executed,
                result=r.result,
                success=r.success,
                executed=r.executed,
            )
            for r in recent
        ],
    }
