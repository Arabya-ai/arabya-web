"""L5 Mastermind + shadow cache + Ollama judge fallback tests."""

from __future__ import annotations

import os

import pytest

os.environ.setdefault("ARABYA_NLP_DATABASE_URL", "sqlite:////tmp/arabya-nlp-mastermind-pytest.sqlite")
os.environ.setdefault("ARABYA_NLP_SERVER_LOG", "/tmp/arabya-nlp/mastermind-pytest-server.log")
os.environ.setdefault("ARABYA_NLP_TMP_DIR", "/tmp/arabya-nlp")
os.environ.setdefault("ARABYA_NLP_DEVOPS_ENABLED", "0")
os.environ.setdefault("ARABYA_NLP_LLM_PROOFREAD", "0")
os.environ.setdefault("ARABYA_NLP_MOA", "0")
os.environ.setdefault("ARABYA_NLP_SHADOW_DB", "/tmp/arabya-nlp/shadow-test.sqlite")

from config import Settings, get_settings  # noqa: E402

get_settings.cache_clear()


def test_shadow_cache_record_and_lookup(tmp_path) -> None:
    from app.pipeline.shadow_cache import lookup_shadow, record_shadow

    db = str(tmp_path / "shadow.sqlite")
    settings = Settings(
        _env_file=None,
        database_url="sqlite:////tmp/arabya-nlp-shadow.sqlite",
        server_log_path="/tmp/arabya-nlp/shadow.log",
        tmp_dir=str(tmp_path),
        shadow_db_path=db,
        shadow_cache_enabled=True,
    )
    record_shadow("ذهبت الى المدرسه", "ذهبت إلى المدرسة", "moa:test", settings=settings)
    hit = lookup_shadow("ذهبت الى المدرسه", settings=settings)
    assert hit is not None
    assert "المدرسة" in hit.corrected
    assert hit.source == "moa:test"


def test_mastermind_skips_ollama_when_ram_high(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.pipeline.mastermind import build_mastermind_plan

    settings = Settings(
        _env_file=None,
        database_url="sqlite:////tmp/arabya-nlp-mm.sqlite",
        server_log_path="/tmp/arabya-nlp/mm.log",
        tmp_dir="/tmp/arabya-nlp",
        llm_proofread_enabled=True,
        mastermind_ram_skip_ollama_pct=50.0,
    )

    monkeypatch.setattr("app.pipeline.mastermind._ram_percent", lambda: 90.0)
    monkeypatch.setattr(
        "app.pipeline.mastermind.OllamaClient",
        lambda _s: type("C", (), {"is_up_sync": lambda self: True})(),
    )
    plan = build_mastermind_plan(settings=settings, use_moa=False, skip_llm=False)
    assert plan.run_ollama is False
    assert plan.conserve is True


@pytest.mark.asyncio
async def test_ollama_judge_fallback_when_hf_judge_fails(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.pipeline import moa_stage

    settings = Settings(
        _env_file=None,
        database_url="sqlite:////tmp/arabya-nlp-oj.sqlite",
        server_log_path="/tmp/arabya-nlp/oj.log",
        tmp_dir="/tmp/arabya-nlp",
        moa_enabled=True,
        ollama_judge_fallback=True,
        llm_proofread_enabled=True,
    )

    async def fake_proposer(**_kwargs):
        return {
            "role": "jais",
            "model": "test/jais",
            "ok": True,
            "error": "",
            "corrected": "هذا لكن مهم",
            "edits": [],
            "engine": "moa-proposer:jais:test",
        }

    async def fail_judge(**_kwargs):
        return {"ok": False, "error": "fail", "corrected": "x", "edits": [], "engine": "moa-judge:fail"}

    async def ok_ollama_judge(**_kwargs):
        return {
            "ok": True,
            "error": "",
            "corrected": "هذا لكن مهم",
            "edits": [],
            "engine": "moa-ollama-judge:llama3.1:8b",
        }

    monkeypatch.setattr(moa_stage, "_run_proposer", fake_proposer)
    monkeypatch.setattr(moa_stage, "_run_judge", fail_judge)
    monkeypatch.setattr(moa_stage, "_run_ollama_judge", ok_ollama_judge)
    monkeypatch.setenv("LUGHAWI_HF_TOKEN", "hf_test_token")

    out = await moa_stage.run_moa_stage(
        "هذا لاكن مهم",
        settings=settings,
        force=True,
        hf_token="hf_test",
    )
    assert out.mode == "moa-ollama-judge"
    assert "ollama-judge" in out.engine


@pytest.mark.asyncio
async def test_shadow_cache_prefers_learned_text(tmp_path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Cached MoA correction must not be overwritten by rules-only apply."""
    from app.pipeline import proofreader
    from app.pipeline.shadow_cache import record_shadow
    from config import Settings, get_settings

    db = str(tmp_path / "shadow2.sqlite")
    settings = Settings(
        _env_file=None,
        database_url="sqlite:////tmp/arabya-nlp-shadow2.sqlite",
        server_log_path="/tmp/arabya-nlp/shadow2.log",
        tmp_dir=str(tmp_path),
        shadow_db_path=db,
        shadow_cache_enabled=True,
        mastermind_enabled=True,
        llm_proofread_enabled=False,
        moa_enabled=False,
    )
    get_settings.cache_clear()
    record_shadow(
        "ذهبت الى المدرسه",
        "ذهبت إلى المدرسة",
        "moa:judge",
        settings=settings,
    )
    out = await proofreader.proofread_text(
        "ذهبت الى المدرسه",
        skip_llm=True,
        use_moa=False,
        settings=settings,
        db=None,
    )
    assert out.shadow_cache_hit is True
    assert "المدرسة" in out.corrected
    assert "إلى" in out.corrected or "الى" not in out.corrected or out.corrected == "ذهبت إلى المدرسة"
