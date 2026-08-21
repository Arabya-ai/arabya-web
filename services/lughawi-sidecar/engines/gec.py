"""
Arabic GEC — Contabo-complete with optional HF acceleration.

Policy (owner):
1) Contabo local must always work (never depend on HF token remaining).
2) If LUGHAWI_HF_TOKEN works → try HF first to spare Contabo RAM/CPU.
3) On HF failure / quota / model disabled → automatic local Contabo fallback.

Order:
1) HF remote Alnnahwi (only when token + LUGHAWI_PREFER_HF≠0)
2) Local Alnnahwi (transformers) when weights present
3) Local AraBART if present
"""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.request
from typing import Any

ALNNAHWI_MODEL = os.environ.get(
    "LUGHAWI_GEC_MODEL",
    "alnnahwi/gemma-3-1b-arabic-gec-v1",
)
ARABART_MODEL = "CAMeL-Lab/arabart-qalb14-gec-ged-13"

_local_pipe = None
_local_failed = False
_arabart_pipe = None
_arabart_failed = False


def _hf_token() -> str:
    return (
        os.environ.get("LUGHAWI_HF_TOKEN", "").strip()
        or os.environ.get("HF_TOKEN", "").strip()
        or os.environ.get("HUGGING_FACE_HUB_TOKEN", "").strip()
    )


def _prefer_hf() -> bool:
    """Use HF first when token exists, unless explicitly disabled."""
    flag = os.environ.get("LUGHAWI_PREFER_HF", "1").strip().lower()
    if flag in {"0", "false", "no", "off"}:
        return False
    return bool(_hf_token())


def _allow_local_neural() -> bool:
    """Local neural is ON by default (Contabo-complete). Set LUGHAWI_GEC_LOCAL=0 to skip."""
    flag = os.environ.get("LUGHAWI_GEC_LOCAL", "1").strip().lower()
    return flag not in {"0", "false", "no", "off"}


def _extract_alnnahwi_response(generated_text: str) -> str:
    marker = "\nmodel\n"
    if marker in generated_text:
        return generated_text[generated_text.find(marker) + len(marker) :].strip()
    alt = "model\n"
    if alt in generated_text:
        return generated_text[generated_text.find(alt) + len(alt) :].strip()
    return generated_text.strip()


def gec_hf_remote(text: str) -> dict[str, Any] | None:
    """Call HF Inference API. Returns None if skipped; dict with warning on soft fail."""
    if not _prefer_hf():
        return None
    token = _hf_token()
    if not token:
        return None
    sample = text if len(text) <= 800 else text[:800]
    urls = [
        f"https://router.huggingface.co/hf-inference/models/{ALNNAHWI_MODEL}",
        f"https://api-inference.huggingface.co/models/{ALNNAHWI_MODEL}",
    ]
    payload = json.dumps(
        {
            "inputs": sample,
            "parameters": {
                "max_new_tokens": min(512, max(64, len(sample) + 32)),
                "return_full_text": False,
            },
        }
    ).encode("utf-8")
    last_err = ""
    for url in urls:
        req = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=45) as res:
                raw = res.read().decode("utf-8", errors="replace")
            data = json.loads(raw)
            corrected = sample
            if isinstance(data, list) and data:
                row = data[0]
                if isinstance(row, dict):
                    corrected = str(
                        row.get("generated_text")
                        or row.get("translation_text")
                        or row.get("summary_text")
                        or sample
                    )
            elif isinstance(data, dict):
                if "error" in data:
                    last_err = str(data.get("error"))
                    continue
                corrected = str(data.get("generated_text") or sample)
            corrected = _extract_alnnahwi_response(corrected)
            edits: list[dict[str, Any]] = []
            if corrected and corrected != sample:
                edits.append(
                    {
                        "id": "alnnahwi-hf-1",
                        "start": 0,
                        "end": len(sample),
                        "type": "grammar",
                        "original": sample,
                        "suggestion": corrected,
                        "ruleId": "alnnahwi-gemma3-1b-gec",
                        "explanation": "تصحيح نحوي عربي (Alnnahwi عبر Hugging Face — توفير موارد Contabo)",
                        "confidence": 0.78,
                        "source": "gec",
                        "status": "proposed",
                    }
                )
            return {
                "ok": True,
                "text": corrected if len(text) <= 800 else corrected + text[800:],
                "edits": edits,
                "engine": f"hf-remote:{ALNNAHWI_MODEL}",
            }
        except urllib.error.HTTPError as e:
            last_err = f"HTTP {e.code}"
            continue
        except Exception as e:
            last_err = f"{type(e).__name__}"
            continue
    return {
        "ok": True,
        "text": text,
        "edits": [],
        "engine": "hf-remote-failed",
        "warning": last_err or "HF Inference unavailable — will try Contabo local",
    }


def _get_alnnahwi_local():  # type: ignore[no-untyped-def]
    global _local_pipe, _local_failed
    if not _allow_local_neural():
        return None
    if _local_failed:
        return None
    if _local_pipe is not None:
        return _local_pipe
    try:
        from transformers import AutoTokenizer, pipeline

        tok = AutoTokenizer.from_pretrained(ALNNAHWI_MODEL)
        tok.chat_template = (
            "{% for message in messages %}"
            "{{'<start_of_turn>' + message['role'] + '\\n' + message['content'] + '<end_of_turn>\\n'}}"
            "{% endfor %}"
            "{% if add_generation_prompt %}{{'<start_of_turn>model\\n'}}{% endif %}"
        )
        _local_pipe = pipeline(
            "text-generation",
            model=ALNNAHWI_MODEL,
            tokenizer=tok,
            device=-1,
        )
        return _local_pipe
    except Exception:
        _local_failed = True
        return None


def _get_arabart():  # type: ignore[no-untyped-def]
    global _arabart_pipe, _arabart_failed
    if not _allow_local_neural():
        return None
    if _arabart_failed:
        return None
    if _arabart_pipe is not None:
        return _arabart_pipe
    try:
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline

        tok = AutoTokenizer.from_pretrained(ARABART_MODEL)
        model = AutoModelForSeq2SeqLM.from_pretrained(ARABART_MODEL)
        _arabart_pipe = pipeline(
            "text2text-generation",
            model=model,
            tokenizer=tok,
            device=-1,
        )
        return _arabart_pipe
    except Exception:
        _arabart_failed = True
        return None


def _local_alnnahwi(text: str) -> dict[str, Any] | None:
    pipe = _get_alnnahwi_local()
    if pipe is None:
        return None
    try:
        sample = text if len(text) <= 800 else text[:800]
        messages = [{"role": "user", "content": sample}]
        prompt = pipe.tokenizer.apply_chat_template(
            messages, tokenize=False, add_generation_prompt=True
        )
        outputs = pipe(
            prompt,
            max_new_tokens=min(512, max(64, len(sample) + 32)),
            do_sample=False,
        )
        full = str(outputs[0].get("generated_text") or sample)
        corrected = _extract_alnnahwi_response(full)
        edits: list[dict[str, Any]] = []
        if corrected and corrected != sample:
            edits.append(
                {
                    "id": "alnnahwi-local-1",
                    "start": 0,
                    "end": len(sample),
                    "type": "grammar",
                    "original": sample,
                    "suggestion": corrected,
                    "ruleId": "alnnahwi-gemma3-1b-gec-local",
                    "explanation": "تصحيح نحوي عربي (Alnnahwi محلي على Contabo — لا يعتمد على توكن)",
                    "confidence": 0.76,
                    "source": "gec",
                    "status": "proposed",
                }
            )
        return {
            "ok": True,
            "text": corrected if len(text) <= 800 else corrected + text[800:],
            "edits": edits,
            "engine": f"contabo-local:{ALNNAHWI_MODEL}",
        }
    except Exception as e:
        return {
            "ok": True,
            "text": text,
            "edits": [],
            "engine": "contabo-local-error",
            "warning": f"{type(e).__name__}",
        }


def _local_arabart(text: str) -> dict[str, Any] | None:
    arabart = _get_arabart()
    if arabart is None:
        return None
    try:
        sample = text if len(text) <= 800 else text[:800]
        out = arabart(sample, max_new_tokens=min(512, max(64, len(sample) + 32)))
        corrected = sample
        if isinstance(out, list) and out:
            corrected = str(out[0].get("generated_text") or sample)
        edits: list[dict[str, Any]] = []
        if corrected != sample:
            edits.append(
                {
                    "id": "arabart-1",
                    "start": 0,
                    "end": len(sample),
                    "type": "grammar",
                    "original": sample,
                    "suggestion": corrected,
                    "ruleId": "arabart-gec",
                    "explanation": "تصحيح نحوي (AraBART محلي Contabo)",
                    "confidence": 0.72,
                    "source": "gec",
                    "status": "proposed",
                }
            )
        return {
            "ok": True,
            "text": corrected if len(text) <= 800 else corrected + text[800:],
            "edits": edits,
            "engine": f"contabo-local:{ARABART_MODEL}",
        }
    except Exception as e:
        return {
            "ok": True,
            "text": text,
            "edits": [],
            "engine": "arabart-error",
            "warning": f"{type(e).__name__}",
        }


def gec_neural(text: str) -> dict[str, Any]:
    warnings: list[str] = []

    # 1) Optional HF acceleration
    remote = gec_hf_remote(text)
    if remote is not None and str(remote.get("engine", "")).startswith("hf-remote:"):
        return remote
    if remote is not None and remote.get("warning"):
        warnings.append(str(remote["warning"]))

    # 2) Contabo local Alnnahwi (foundation — must not depend on token)
    local = _local_alnnahwi(text)
    if local is not None and str(local.get("engine", "")).startswith("contabo-local:"):
        if warnings:
            local = {**local, "warning": " · ".join(warnings + ([local.get("warning")] if local.get("warning") else []))}
        return local
    if local is not None and local.get("warning"):
        warnings.append(str(local["warning"]))

    # 3) AraBART local fallback
    arabart = _local_arabart(text)
    if arabart is not None and str(arabart.get("engine", "")).startswith("contabo-local:"):
        if warnings:
            arabart = {
                **arabart,
                "warning": " · ".join(
                    warnings + ([arabart.get("warning")] if arabart.get("warning") else [])
                ),
            }
        return arabart

    if not _allow_local_neural():
        warnings.append("النموذج المحلي معطّل (LUGHAWI_GEC_LOCAL=0)")
    else:
        warnings.append(
            "ثبّت النماذج المحلية: bash scripts/contabo-lughawi-sidecar-deps.sh "
            "(يُنزّل Alnnahwi على Contabo)"
        )

    return {
        "ok": True,
        "text": text,
        "edits": [],
        "engine": "gec-unloaded",
        "warning": " · ".join(warnings) or "لا يوجد محرك GEC عصبي جاهز على Contabo",
    }


def local_gec_ready() -> bool:
    return _get_alnnahwi_local() is not None or _get_arabart() is not None
