"""ORM models for analytics, history, and DevOps audit trails."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ProofreadJob(Base):
    __tablename__ = "proofread_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    input_text: Mapped[str] = mapped_column(Text, nullable=False)
    cleaned_text: Mapped[str] = mapped_column(Text, nullable=False)
    corrected_text: Mapped[str] = mapped_column(Text, nullable=False)
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    stage1_engine: Mapped[str] = mapped_column(String(128), default="")
    stage2_engine: Mapped[str] = mapped_column(String(128), default="")
    errors_json: Mapped[str] = mapped_column(Text, default="[]")
    preserve_diacritics: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), default=utcnow
    )


class TranscriptionJob(Base):
    __tablename__ = "transcription_jobs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    client_ip: Mapped[str | None] = mapped_column(String(64), nullable=True)
    filename: Mapped[str] = mapped_column(String(512), default="")
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    raw_transcript: Mapped[str] = mapped_column(Text, default="")
    proofread_text: Mapped[str] = mapped_column(Text, default="")
    stt_engine: Mapped[str] = mapped_column(String(128), default="")
    word_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), default=utcnow
    )


class GrammarErrorStat(Base):
    """Aggregated linguistic analytics for academic research."""

    __tablename__ = "grammar_error_stats"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    error_type: Mapped[str] = mapped_column(String(64), index=True)
    original: Mapped[str] = mapped_column(String(256), index=True)
    suggestion: Mapped[str] = mapped_column(String(256), default="")
    rule_id: Mapped[str] = mapped_column(String(128), default="")
    hit_count: Mapped[int] = mapped_column(Integer, default=1)
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), default=utcnow
    )


class AgentAuditLog(Base):
    __tablename__ = "agent_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), default=utcnow
    )
    anomaly_type: Mapped[str] = mapped_column(String(128), default="")
    error_excerpt: Mapped[str] = mapped_column(Text, default="")
    ai_analysis: Mapped[str] = mapped_column(Text, default="")
    action_key: Mapped[str] = mapped_column(String(64), default="")
    command_executed: Mapped[str] = mapped_column(String(512), default="")
    result: Mapped[str] = mapped_column(Text, default="")
    success: Mapped[bool] = mapped_column(Boolean, default=False)
    executed: Mapped[bool] = mapped_column(Boolean, default=False)


class MetricSnapshot(Base):
    __tablename__ = "metric_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), default=utcnow
    )
    cpu_percent: Mapped[float] = mapped_column(Float, default=0.0)
    ram_percent: Mapped[float] = mapped_column(Float, default=0.0)
    disk_percent: Mapped[float] = mapped_column(Float, default=0.0)
    ollama_up: Mapped[bool] = mapped_column(Boolean, default=False)
    fastapi_ok: Mapped[bool] = mapped_column(Boolean, default=True)
    agent_ok: Mapped[bool] = mapped_column(Boolean, default=True)
