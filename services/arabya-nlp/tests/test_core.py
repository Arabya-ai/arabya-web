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


def test_default_bind_host_is_all_interfaces(monkeypatch: pytest.MonkeyPatch) -> None:
    from config import Settings

    # Contabo Next.js / ServerAvatar path requires 0.0.0.0 (not 127.0.0.1 only)
    monkeypatch.delenv("ARABYA_NLP_HOST", raising=False)
    monkeypatch.delenv("ARABYA_NLP_PORT", raising=False)
    s = Settings(
        _env_file=None,
        database_url="sqlite:////tmp/arabya-nlp-host-test.sqlite",
        server_log_path="/tmp/arabya-nlp/host-test.log",
        tmp_dir="/tmp/arabya-nlp",
    )
    assert s.host == "0.0.0.0"
    assert s.port == 8092


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


def test_rule_stage_inna_sound_masculine() -> None:
    from app.pipeline.rule_stage import run_rule_stage

    sentence = "إن المعلمون يرفعون شأن الأمة لاكن الطلاب لم يهتموا بالدرس"
    out = run_rule_stage(sentence, preserve_diacritics=True)
    assert "المعلمين" in out.text
    assert "لكن" in out.text
    originals = {e.original for e in out.edits}
    suggestions = {e.suggestion for e in out.edits}
    assert "المعلمون" in originals
    assert "المعلمين" in suggestions
    assert "لاكن" in originals
    assert "لكن" in suggestions


def test_remap_edits_to_original_recovers_zero_spans() -> None:
    from app.pipeline.proofreader import remap_edits_to_original

    original = "إن المعلمون يرفعون شأن الأمة لاكن الطلاب"
    raw = [
        {
            "id": "llm-1",
            "start": 0,
            "end": 0,
            "type": "grammar",
            "original": "المعلمون",
            "suggestion": "المعلمين",
            "rule_id": "ollama-grammar",
            "stage": "llm",
        },
        {
            "id": "builtin-1",
            "start": 0,
            "end": 0,
            "type": "spelling",
            "original": "لاكن",
            "suggestion": "لكن",
            "rule_id": "rb-1",
            "stage": "rule",
        },
    ]
    located = remap_edits_to_original(original, raw)
    assert len(located) == 2
    by_orig = {e["original"]: e for e in located}
    assert original[by_orig["المعلمون"]["start"] : by_orig["المعلمون"]["end"]] == "المعلمون"
    assert original[by_orig["لاكن"]["start"] : by_orig["لاكن"]["end"]] == "لاكن"


@pytest.mark.asyncio
async def test_proofread_skip_llm() -> None:
    from app.pipeline.proofreader import proofread_text

    res = await proofread_text("الى المدرسة", skip_llm=True)
    assert res.ok
    assert "إلى" in res.corrected
    assert res.stage2_engine == "llm-skipped"
    assert res.mode == "offline"
    assert res.parallel is False


@pytest.mark.asyncio
async def test_proofread_parallel_merges_rule_priority(monkeypatch: pytest.MonkeyPatch) -> None:
    """Rules + mocked Ollama run together; overlapping spans prefer rules."""
    from app.pipeline import proofreader as pr
    from app.pipeline.llm_stage import LlmStageResult

    async def fake_llm(text: str, **kwargs):  # noqa: ANN003
        return LlmStageResult(
            text=text.replace("لاكن", "لكن").replace("المعلمون", "المعلمين"),
            edits=[
                {
                    "id": "llm-1",
                    "start": 0,
                    "end": 0,
                    "type": "grammar",
                    "original": "المعلمون",
                    "suggestion": "المعلمين",
                    "rule_id": "ollama-grammar",
                    "explanation": "mock",
                    "stage": "llm",
                },
                {
                    "id": "llm-2",
                    "start": 0,
                    "end": 0,
                    "type": "spelling",
                    "original": "لاكن",
                    "suggestion": "لكن",
                    "rule_id": "ollama-grammar",
                    "explanation": "mock",
                    "stage": "llm",
                },
            ],
            engine="ollama:mock",
            raw_ok=True,
        )

    monkeypatch.setattr(pr, "run_llm_stage", fake_llm)
    from types import SimpleNamespace

    settings = SimpleNamespace(
        preserve_diacritics_default=True,
        llm_proofread_enabled=True,
    )

    text = "إن المعلمون يرفعون شأن الأمة لاكن الطلاب"
    res = await pr.proofread_text(text, skip_llm=False, settings=settings)  # type: ignore[arg-type]
    assert res.ok
    assert res.parallel is True
    assert res.mode == "hybrid-parallel"
    assert "المعلمين" in res.corrected
    assert "لكن" in res.corrected
    originals = {e.original for e in res.edits}
    assert "المعلمون" in originals
    assert "لاكن" in originals


def test_optional_engines_snapshot() -> None:
    from app.pipeline.optional_engines import engines_snapshot

    snap = engines_snapshot()
    assert snap["offlineOkWithoutOllama"] is True
    assert "pyarabic" in snap
    assert "mishkal" in snap
    assert "qutrub" in snap


def test_mishkal_tashkeel_graceful_or_real() -> None:
    from app.pipeline.optional_engines import mishkal_available, run_mishkal_tashkeel

    out = run_mishkal_tashkeel("تطلع الشمس")
    if mishkal_available():
        assert out.ok
        assert out.available
        assert out.text != out.original or "َ" in out.text or "ُ" in out.text or "ِ" in out.text
    else:
        assert out.available is False
        assert out.ok is False


def test_qutrub_conjugate_graceful_or_real() -> None:
    from app.pipeline.optional_engines import qutrub_available, run_qutrub_conjugate

    out = run_qutrub_conjugate("كتب", future_type="فتحة")
    if qutrub_available():
        assert out.ok
        assert out.available
        assert "الماضي المعلوم" in out.table
    else:
        assert out.available is False


def test_rate_limit_blocks_sixth_request() -> None:
    from app.security.rate_limit import SlidingWindowRateLimiter

    lim = SlidingWindowRateLimiter()
    for _ in range(5):
        ok, _ = lim.check("guest:1.2.3.4", 5, 3600)
        assert ok
    ok, retry = lim.check("guest:1.2.3.4", 5, 3600)
    assert ok is False
    assert retry >= 1


def test_loopback_is_trusted() -> None:
    from app.security.rate_limit import is_loopback

    assert is_loopback("127.0.0.1")
    assert is_loopback("::1")
    assert is_loopback("localhost")
    assert is_loopback("::ffff:127.0.0.1")
    assert not is_loopback("1.2.3.4")


@pytest.mark.asyncio
async def test_enforce_rate_limit_skips_loopback() -> None:
    from unittest.mock import MagicMock

    from app.security.rate_limit import enforce_rate_limit, limiter

    # Exhaust guest bucket for a fake IP first — loopback must still pass.
    for _ in range(200):
        limiter.check("guest:9.9.9.9", 1, 3600)

    req = MagicMock()
    req.url.path = "/v1/proofread"
    req.headers = {}
    req.client.host = "127.0.0.1"
    await enforce_rate_limit(req)  # must not raise


@pytest.mark.asyncio
async def test_enforce_rate_limit_ignores_xff_on_loopback_peer() -> None:
    """Next may forward browser XFF; TCP peer 127.0.0.1 must still be trusted."""
    from unittest.mock import MagicMock

    from app.security.rate_limit import enforce_rate_limit, limiter

    for _ in range(50):
        limiter.check("guest:203.0.113.9", 1, 3600)

    req = MagicMock()
    req.url.path = "/v1/tashkeel"
    req.headers = {"x-forwarded-for": "203.0.113.9"}
    req.client.host = "127.0.0.1"
    await enforce_rate_limit(req)  # must not raise despite XFF

    # IPv6 loopback + XFF (same Contabo→NLP path via ::1)
    req6 = MagicMock()
    req6.url.path = "/v1/conjugate"
    req6.headers = {"x-forwarded-for": "203.0.113.9, 10.0.0.1"}
    req6.client.host = "::1"
    await enforce_rate_limit(req6)


def test_client_ip_prefers_loopback_peer_over_xff() -> None:
    """Audit helper must not treat forwarded browser IP as client when peer is loopback."""
    from unittest.mock import MagicMock

    from app.security.rate_limit import client_ip, peer_host

    req = MagicMock()
    req.client.host = "127.0.0.1"
    req.headers = {"x-forwarded-for": "198.51.100.7"}
    assert peer_host(req) == "127.0.0.1"
    assert client_ip(req) == "127.0.0.1"

    remote = MagicMock()
    remote.client.host = "10.0.0.5"
    remote.headers = {"x-forwarded-for": "198.51.100.7"}
    assert client_ip(remote) == "198.51.100.7"


@pytest.mark.asyncio
async def test_enforce_rate_limit_applies_to_remote_peer_xff() -> None:
    """Non-loopback peers still rate-limit by XFF (public edge path)."""
    from unittest.mock import MagicMock

    import pytest
    from fastapi import HTTPException

    from app.security.rate_limit import enforce_rate_limit, limiter

    # Match test env: ARABYA_NLP_RATE_LIMIT_REQUESTS=5
    for _ in range(5):
        ok, _ = limiter.check("guest:198.51.100.42", 5, 3600)
        assert ok

    req = MagicMock()
    req.url.path = "/v1/proofread"
    req.headers = {"x-forwarded-for": "198.51.100.42"}
    req.client.host = "10.0.0.8"  # not loopback — XFF must apply
    with pytest.raises(HTTPException) as ei:
        await enforce_rate_limit(req)
    assert ei.value.status_code == 429


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

        engines = client.get("/v1/engines")
        assert engines.status_code == 200
        eng = engines.json()["engines"]
        assert eng["offlineOkWithoutOllama"] is True

        tash = client.post(
            "/v1/tashkeel",
            json={"text": "تطلع الشمس"},
            headers={"Authorization": "Bearer test-token-secret"},
        )
        assert tash.status_code == 200
        assert "available" in tash.json()

        conj = client.post(
            "/v1/conjugate",
            json={"verb": "كتب"},
            headers={"Authorization": "Bearer test-token-secret"},
        )
        assert conj.status_code == 200
        assert "available" in conj.json()

        # Offline health stays ok even without Ollama (yellow, not red).
        assert body["ok"] is True
        ollama = next(c for c in body["components"] if c["name"] == "ollama")
        assert ollama["status"] in {"green", "yellow"}
