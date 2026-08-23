"""
L5 Mastermind — tier orchestrator for لغوي proofread on Contabo.

Decides which engines run based on resources, availability, and cache hits.
Conserves RAM: skips heavy Ollama when memory pressure is high.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field

from app.services.ollama_client import OllamaClient
from config import Settings, get_settings

logger = logging.getLogger("arabya_nlp.mastermind")


@dataclass
class MastermindPlan:
    run_ollama: bool
    run_moa: bool
    use_shadow_cache: bool
    ollama_up: bool
    ram_percent: float
    conserve: bool
    notes: list[str] = field(default_factory=list)


def _ram_percent() -> float:
    try:
        import psutil  # type: ignore

        return float(psutil.virtual_memory().percent)
    except Exception:
        return 0.0


def build_mastermind_plan(
    *,
    settings: Settings | None = None,
    use_moa: bool = False,
    skip_llm: bool = False,
    hf_token_present: bool = False,
) -> MastermindPlan:
    settings = settings or get_settings()
    notes: list[str] = []
    ram = _ram_percent()
    conserve = ram >= float(settings.mastermind_ram_skip_ollama_pct)
    if conserve:
        notes.append(f"ram-high:{ram:.0f}%")

    ollama_up = False
    if settings.llm_proofread_enabled and not skip_llm:
        try:
            ollama_up = OllamaClient(settings).is_up_sync()
        except Exception:
            ollama_up = False

    run_ollama = bool(
        settings.mastermind_enabled
        and settings.llm_proofread_enabled
        and not skip_llm
        and ollama_up
        and not conserve
    )
    if settings.llm_proofread_enabled and not run_ollama and not skip_llm:
        if not ollama_up:
            notes.append("ollama-down")
        elif conserve:
            notes.append("ollama-skipped-ram")

    run_moa = bool(
        settings.mastermind_enabled
        and (use_moa or settings.moa_enabled)
        and hf_token_present
    )
    if (use_moa or settings.moa_enabled) and not hf_token_present:
        notes.append("moa-no-token")

    use_shadow = bool(settings.mastermind_enabled and settings.shadow_cache_enabled)

    return MastermindPlan(
        run_ollama=run_ollama,
        run_moa=run_moa,
        use_shadow_cache=use_shadow,
        ollama_up=ollama_up,
        ram_percent=ram,
        conserve=conserve,
        notes=notes,
    )


def mastermind_summary(plan: MastermindPlan) -> str:
    bits = [
        "cache" if plan.use_shadow_cache else "no-cache",
        "ollama" if plan.run_ollama else "no-ollama",
        "moa" if plan.run_moa else "no-moa",
    ]
    if plan.notes:
        bits.extend(plan.notes[:3])
    return "mastermind:" + "+".join(bits)
