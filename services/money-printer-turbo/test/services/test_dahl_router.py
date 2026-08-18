"""Tests for Dahl key/model rotation helpers."""

from app.services.dahl_router import (
    dahl_keys_from_config,
    dahl_models_from_config,
    is_dahl_base_url,
    parse_csv_values,
)


def test_parse_csv_values():
    assert parse_csv_values("a,b; c") == ["a", "b", "c"]


def test_is_dahl_base_url():
    assert is_dahl_base_url("https://inference.dahl.global/v1")
    assert not is_dahl_base_url("https://api.openai.com/v1")


def test_dahl_keys_from_openai_field():
    keys = dahl_keys_from_config(
        {"openai_api_key": "dahl_one,dahl_two,dahl_one"},
    )
    assert keys == ["dahl_one", "dahl_two"]


def test_dahl_models_prefers_primary():
    models = dahl_models_from_config(
        {"dahl_models": "moonshotai/Kimi-K2.6"},
        "MiniMaxAI/MiniMax-M2.7",
    )
    assert models[0] == "MiniMaxAI/MiniMax-M2.7"
    assert "moonshotai/Kimi-K2.6" in models


def test_should_rotate_on_quota_or_generic_errors():
    from app.services.dahl_router import _should_rotate

    assert _should_rotate(Exception("402 available tokens exhausted"))
    assert _should_rotate(Exception("timeout"))
    assert _should_rotate(Exception("Just a moment..."))
