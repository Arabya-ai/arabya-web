"""MoA stage — offline-safe: disabled / no-token never call HF."""

from __future__ import annotations

import os

import pytest

os.environ.setdefault("ARABYA_NLP_DATABASE_URL", "sqlite:////tmp/arabya-nlp-moa-pytest.sqlite")
os.environ.setdefault("ARABYA_NLP_SERVER_LOG", "/tmp/arabya-nlp/moa-pytest-server.log")
os.environ.setdefault("ARABYA_NLP_TMP_DIR", "/tmp/arabya-nlp")
os.environ.setdefault("ARABYA_NLP_DEVOPS_ENABLED", "0")
os.environ.setdefault("ARABYA_NLP_LLM_PROOFREAD", "0")
os.environ.setdefault("ARABYA_NLP_MOA", "0")

from config import Settings, get_settings  # noqa: E402

get_settings.cache_clear()


@pytest.mark.asyncio
async def test_moa_skipped_when_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.pipeline.moa_stage import run_moa_stage

    monkeypatch.delenv("LUGHAWI_HF_TOKEN", raising=False)
    monkeypatch.delenv("HF_TOKEN", raising=False)
    monkeypatch.delenv("ARABYA_NLP_HF_TOKEN", raising=False)
    settings = Settings(
        _env_file=None,
        database_url="sqlite:////tmp/arabya-nlp-moa-off.sqlite",
        server_log_path="/tmp/arabya-nlp/moa-off.log",
        tmp_dir="/tmp/arabya-nlp",
        moa_enabled=False,
    )
    out = await run_moa_stage("هذا لاكن مهم", settings=settings)
    assert out.engine == "moa-skipped"
    assert out.mode == "disabled"
    assert out.edits == []


@pytest.mark.asyncio
async def test_moa_skipped_without_token(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.pipeline.moa_stage import run_moa_stage

    for key in (
        "LUGHAWI_HF_TOKEN",
        "HF_TOKEN",
        "HUGGING_FACE_HUB_TOKEN",
        "ARABYA_NLP_HF_TOKEN",
    ):
        monkeypatch.delenv(key, raising=False)
    settings = Settings(
        _env_file=None,
        database_url="sqlite:////tmp/arabya-nlp-moa-notoken.sqlite",
        server_log_path="/tmp/arabya-nlp/moa-notoken.log",
        tmp_dir="/tmp/arabya-nlp",
        moa_enabled=True,
    )
    out = await run_moa_stage("هذا لاكن مهم", settings=settings, force=True)
    assert out.engine == "moa-skipped"
    assert out.mode == "no-token"
    assert any("token" in w.lower() for w in out.warnings)


@pytest.mark.asyncio
async def test_proofread_unchanged_without_moa() -> None:
    from app.pipeline.proofreader import proofread_text

    get_settings.cache_clear()
    out = await proofread_text(
        "هذا لاكن مهم",
        skip_llm=True,
        use_moa=False,
        db=None,
    )
    assert out.ok
    assert "لكن" in out.corrected
    assert out.moa_engine in {"", "moa-skipped"}
