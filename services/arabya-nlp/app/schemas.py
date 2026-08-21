"""Pydantic request/response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class ProofreadRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=50_000)
    preserve_diacritics: bool | None = None
    skip_llm: bool = False


class TextEdit(BaseModel):
    id: str
    start: int
    end: int
    type: str
    original: str
    suggestion: str
    rule_id: str = ""
    explanation: str = ""
    stage: str = "rule"


class ProofreadResponse(BaseModel):
    ok: bool = True
    original: str
    cleaned: str
    corrected: str
    word_count: int
    stage1_engine: str
    stage2_engine: str
    edits: list[TextEdit] = []
    warnings: list[str] = []


class TranscribeResponse(BaseModel):
    ok: bool = True
    filename: str
    duration_seconds: float
    raw_transcript: str
    proofread_text: str
    stt_engine: str
    word_count: int
    proofread: ProofreadResponse | None = None
    warnings: list[str] = []


class HealthComponent(BaseModel):
    name: str
    status: str  # green | red | yellow
    detail: str = ""


class HealthResponse(BaseModel):
    ok: bool
    service: str
    version: str
    components: list[HealthComponent]
    cpu_percent: float
    ram_percent: float
    disk_percent: float
    policy: dict[str, Any]


class AgentAuditRow(BaseModel):
    id: int
    detected_at: datetime
    anomaly_type: str
    error_excerpt: str
    ai_analysis: str
    action_key: str
    command_executed: str
    result: str
    success: bool
    executed: bool


class AnalyticsSummary(BaseModel):
    total_proofread_jobs: int
    total_words_processed: int
    total_transcription_jobs: int
    total_audio_minutes: float
    top_errors: list[dict[str, Any]]
    recent_agent_actions: list[AgentAuditRow]
