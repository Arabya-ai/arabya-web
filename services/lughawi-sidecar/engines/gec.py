"""
Optional neural Arabic GEC (Grammar Error Correction).

Preferred model when transformers+torch installed and weights cached:
  CAMeL-Lab/arabart-qalb14-gec-ged-13

Without weights: returns empty edits and points callers to rules-nlp.
"""

from __future__ import annotations

import os
from typing import Any

_pipe = None
_pipe_failed = False

DEFAULT_MODEL = os.environ.get(
    "LUGHAWI_GEC_MODEL",
    "CAMeL-Lab/arabart-qalb14-gec-ged-13",
)


def _get_pipe():  # type: ignore[no-untyped-def]
    global _pipe, _pipe_failed
    if _pipe_failed:
        return None
    if _pipe is not None:
        return _pipe
    try:
        from transformers import AutoModelForSeq2SeqLM, AutoTokenizer, pipeline

        model_id = DEFAULT_MODEL
        tok = AutoTokenizer.from_pretrained(model_id)
        model = AutoModelForSeq2SeqLM.from_pretrained(model_id)
        _pipe = pipeline(
            "text2text-generation",
            model=model,
            tokenizer=tok,
            device=-1,  # CPU on Contabo unless CUDA available
        )
        return _pipe
    except Exception:
        _pipe_failed = True
        return None


def gec_neural(text: str) -> dict[str, Any]:
    pipe = _get_pipe()
    if pipe is None:
        return {
            "ok": True,
            "text": text,
            "edits": [],
            "engine": "gec-unloaded",
            "warning": (
                "نموذج GEC العصبي غير محمّل. ثبّت transformers+torch ثم: "
                f"huggingface-cli download {DEFAULT_MODEL}"
            ),
        }

    try:
        # Keep Contabo CPU safe — truncate very long inputs.
        sample = text if len(text) <= 800 else text[:800]
        out = pipe(sample, max_new_tokens=min(512, max(64, len(sample) + 32)))
        corrected = sample
        if isinstance(out, list) and out:
            corrected = str(out[0].get("generated_text") or sample)
        edits: list[dict[str, Any]] = []
        if corrected != sample:
            edits.append(
                {
                    "id": "gec-1",
                    "start": 0,
                    "end": len(sample),
                    "type": "grammar",
                    "original": sample,
                    "suggestion": corrected,
                    "ruleId": "arabart-gec",
                    "explanation": "تصحيح نحوي سياقي (AraBART GEC)",
                    "confidence": 0.72,
                    "source": "gec",
                    "status": "proposed",
                }
            )
        return {
            "ok": True,
            "text": corrected if len(text) <= 800 else corrected + text[800:],
            "edits": edits,
            "engine": f"gec:{DEFAULT_MODEL}",
        }
    except Exception as e:
        return {
            "ok": True,
            "text": text,
            "edits": [],
            "engine": "gec-error",
            "warning": f"GEC failed: {type(e).__name__}",
        }
