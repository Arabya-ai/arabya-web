"""Unit tests — sandbox, rule stage, rate limit, API smoke (no Ollama required)."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

# Contabo-safe local paths for CI / cloud agent
os.environ.setdefault("ARABYA_NLP_DATABASE_URL", "sqlite:////tmp/arabya-nlp-pytest.sqlite")
os.environ.setdefault("ARABYA_NLP_SERVER_LOG", "/tmp/arabya-nlp/pytest-server.log")
os.environ.setdefault("ARABYA_NLP_TMP_DIR", "/tmp/arabya-nlp")
os.environ.setdefault("ARABYA_NLP_DEVOPS_ENABLED", "0")
os.environ.setdefault("ARABYA_NLP_LLM_PROOFREAD", "0")
os.environ.setdefault("ARABYA_NLP_RATE_LIMIT_REQUESTS", "5")
os.environ.setdefault("ARABYA_NLP_RATE_LIMIT_WINDOW", "3600")
os.environ.setdefault("ARABYA_NLP_API_TOKENS", "test-token-secret")

from config import get_settings  # noqa: E402

get_settings.cache_clear()


def test_reject_supabase_url() -> None:
    from pydantic import ValidationError

    from config import Settings

    with pytest.raises(ValidationError):
        Settings(
            database_url="postgresql://user:pass@db.supabase.co/postgres",
        )


def test_command_sandbox_rejects_unknown() -> None:
    from app.security.command_sandbox import execute_whitelisted, resolve_action_key

    assert resolve_action_key("rm -rf /") is None
    assert resolve_action_key("curl http://evil") is None
    bad = execute_whitelisted("rm -rf /")
    assert bad.allowed is False
    assert bad.returncode == 126


def test_command_sandbox_dry_run_disk() -> None:
    from app.security.command_sandbox import execute_whitelisted, resolve_action_key

    key = resolve_action_key("df -h")
    assert key == "disk_usage"
    result = execute_whitelisted("disk_usage", dry_run=True)
    assert result.allowed is True
    assert result.argv == ["df", "-h", "/"]


def test_rule_stage_builtin_pairs() -> None:
    from app.pipeline.rule_stage import run_rule_stage

    out = run_rule_stage("هذا لاكن مهم", preserve_diacritics=True)
    assert "لكن" in out.text
    assert out.edits


@pytest.mark.asyncio
async def test_proofread_skip_llm() -> None:
    from app.pipeline.proofreader import proofread_text

    res = await proofread_text("الى المدرسة", skip_llm=True)
    assert res.ok
    assert "إلى" in res.corrected
    assert res.stage2_engine == "llm-skipped"


def test_rate_limit_blocks_sixth_request() -> None:
    from app.security.rate_limit import SlidingWindowRateLimiter

    lim = SlidingWindowRateLimiter()
    for _ in range(5):
        ok, _ = lim.check("guest:1.2.3.4", 5, 3600)
        assert ok
    ok, retry = lim.check("guest:1.2.3.4", 5, 3600)
    assert ok is False
    assert retry >= 1


def test_fastapi_health_and_proofread() -> None:
    from fastapi.testclient import TestClient

    get_settings.cache_clear()
    from app.database import init_db
    import main as main_mod

    init_db()

    with TestClient(main_mod.app) as client:
        health = client.get("/health")
        assert health.status_code == 200
        body = health.json()
        assert body["service"] == "arabya-nlp"
        assert "components" in body

        # Authenticated path bypasses guest limiter
        res = client.post(
            "/v1/proofread",
            json={"text": "الذى ذهب الى السوق", "skip_llm": True},
            headers={"Authorization": "Bearer test-token-secret"},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["ok"] is True
        assert "الذي" in data["corrected"] or "إلى" in data["corrected"]

        dash = client.get("/dashboard")
        assert dash.status_code == 200
        assert "عربية NLP" in dash.text
