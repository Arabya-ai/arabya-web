"""
Arabic GEC engines — prefer Hugging Face Inference API to spare Contabo RAM.

Order:
1) HF Inference remote: alnnahwi/gemma-3-1b-arabic-gec-v1 (when LUGHAWI_HF_TOKEN set)
2) Local transformers Alnnahwi (heavy — only if LUGHAWI_GEC_LOCAL=1)
3) Legacy AraBART local if already loaded
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


def _extract_alnnahwi_response(generated_text: str) -> str:
    marker = "\nmodel\n"
    if marker in generated_text:
        return generated_text[generated_text.find(marker) + len(marker) :].strip()
    alt = "model\n"
    if alt in generated_text:
        return generated_text[generated_text.find(alt) + len(alt) :].strip()
    return generated_text.strip()


def gec_hf_remote(text: str) -> dict[str, Any] | None:
    """Call HF Inference API. Returns None if token missing or request fails soft."""
    token = _hf_token()
    if not token:
        return None
    sample = text if len(text) <= 800 else text[:800]
    # Prefer router; fall back to classic inference URL.
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
                        "explanation": "تصحيح نحوي عربي (Alnnahwi Gemma-3-1B عبر Hugging Face)",
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
        "warning": last_err or "HF Inference unavailable",
    }


def _get_alnnahwi_local():  # type: ignore[no-untyped-def]
    global _local_pipe, _local_failed
    if os.environ.get("LUGHAWI_GEC_LOCAL", "").strip() not in {"1", "true", "yes"}:
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


def gec_neural(text: str) -> dict[str, Any]:
    remote = gec_hf_remote(text)
    if remote is not None and remote.get("engine", "").startswith("hf-remote:"):
        return remote
    if remote is not None and remote.get("edits"):
        return remote

    pipe = _get_alnnahwi_local()
    if pipe is not None:
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
                        "explanation": "تصحيح نحوي عربي (Alnnahwi محلي على Contabo)",
                        "confidence": 0.76,
                        "source": "gec",
                        "status": "proposed",
                    }
                )
            return {
                "ok": True,
                "text": corrected if len(text) <= 800 else corrected + text[800:],
                "edits": edits,
                "engine": f"local:{ALNNAHWI_MODEL}",
            }
        except Exception as e:
            pass_err = f"{type(e).__name__}"
        else:
            pass_err = ""
    else:
        pass_err = ""

    arabart = _get_arabart()
    if arabart is not None:
        try:
            sample = text if len(text) <= 800 else text[:800]
            out = arabart(sample, max_new_tokens=min(512, max(64, len(sample) + 32)))
            corrected = sample
            if isinstance(out, list) and out:
                corrected = str(out[0].get("generated_text") or sample)
            edits = []
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
                        "explanation": "تصحيح نحوي (AraBART)",
                        "confidence": 0.72,
                        "source": "gec",
                        "status": "proposed",
                    }
                )
            return {
                "ok": True,
                "text": corrected if len(text) <= 800 else corrected + text[800:],
                "edits": edits,
                "engine": f"local:{ARABART_MODEL}",
            }
        except Exception as e:
            pass_err = pass_err or f"{type(e).__name__}"

    warning_parts = []
    if not _hf_token():
        warning_parts.append(
            "أضف LUGHAWI_HF_TOKEN في .env لتشغيل Alnnahwi عبر Hugging Face دون استهلاك RAM السيرفر"
        )
    if remote and remote.get("warning"):
        warning_parts.append(str(remote.get("warning")))
    if pass_err:
        warning_parts.append(pass_err)
    return {
        "ok": True,
        "text": text,
        "edits": [],
        "engine": "gec-unloaded",
        "warning": " · ".join(warning_parts)
        or "لا يوجد محرك GEC عصبي جاهز (HF token أو نموذج محلي)",
    }
