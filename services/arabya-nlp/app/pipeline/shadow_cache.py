"""
L5 shadow cache — learn from all model outputs (MoA, Ollama, rules merge).

Stores successful corrections for fast replay without cloud API calls.
Contabo SQLite only — never cloud.
"""

from __future__ import annotations

import logging
import re
import sqlite3
from dataclasses import dataclass
from datetime import datetime, timezone
from difflib import SequenceMatcher
from pathlib import Path
from typing import Any

from config import Settings, get_settings

logger = logging.getLogger("arabya_nlp.shadow_cache")

_WS_RE = re.compile(r"\s+")


def _normalize(text: str) -> str:
    t = (text or "").strip()
    t = _WS_RE.sub(" ", t)
    return t


@dataclass
class ShadowHit:
    original: str
    corrected: str
    source: str
    similarity: float
    hit_count: int


def _connect(path: str) -> sqlite3.Connection:
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path, timeout=5.0)
    conn.row_factory = sqlite3.Row
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS shadow_corrections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            norm_key TEXT NOT NULL,
            original TEXT NOT NULL,
            corrected TEXT NOT NULL,
            source TEXT NOT NULL,
            meta_json TEXT DEFAULT '{}',
            hit_count INTEGER DEFAULT 1,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_shadow_norm ON shadow_corrections(norm_key)"
    )
    conn.commit()
    return conn


def lookup_shadow(
    text: str,
    *,
    settings: Settings | None = None,
    min_similarity: float = 0.92,
) -> ShadowHit | None:
    settings = settings or get_settings()
    if not settings.shadow_cache_enabled:
        return None
    original = (text or "").strip()
    if not original:
        return None
    norm = _normalize(original)
    try:
        with _connect(settings.shadow_db_path) as conn:
            row = conn.execute(
                """
                SELECT original, corrected, source, hit_count
                FROM shadow_corrections
                WHERE norm_key = ?
                ORDER BY hit_count DESC, updated_at DESC
                LIMIT 1
                """,
                (norm,),
            ).fetchone()
            if row and row["corrected"] and row["corrected"] != row["original"]:
                return ShadowHit(
                    original=row["original"],
                    corrected=row["corrected"],
                    source=row["source"],
                    similarity=1.0,
                    hit_count=int(row["hit_count"] or 1),
                )

            # Fuzzy: scan recent rows (cap 40) for near-duplicate inputs
            rows = conn.execute(
                """
                SELECT original, corrected, source, hit_count
                FROM shadow_corrections
                ORDER BY updated_at DESC
                LIMIT 40
                """
            ).fetchall()
            best: ShadowHit | None = None
            for r in rows:
                sim = SequenceMatcher(None, norm, _normalize(r["original"])).ratio()
                if sim >= min_similarity and r["corrected"] != r["original"]:
                    hit = ShadowHit(
                        original=r["original"],
                        corrected=r["corrected"],
                        source=r["source"],
                        similarity=sim,
                        hit_count=int(r["hit_count"] or 1),
                    )
                    if best is None or hit.similarity > best.similarity:
                        best = hit
            return best
    except Exception:
        logger.exception("shadow cache lookup failed")
        return None


def record_shadow(
    original: str,
    corrected: str,
    source: str,
    *,
    settings: Settings | None = None,
    meta: dict[str, Any] | None = None,
) -> None:
    settings = settings or get_settings()
    if not settings.shadow_cache_enabled:
        return
    original = (original or "").strip()
    corrected = (corrected or "").strip()
    if not original or not corrected or original == corrected:
        return
    norm = _normalize(original)
    now = datetime.now(timezone.utc).isoformat()
    import json

    meta_json = json.dumps(meta or {}, ensure_ascii=False)
    try:
        with _connect(settings.shadow_db_path) as conn:
            existing = conn.execute(
                "SELECT id, hit_count FROM shadow_corrections WHERE norm_key = ? AND source = ?",
                (norm, source),
            ).fetchone()
            if existing:
                conn.execute(
                    """
                    UPDATE shadow_corrections
                    SET corrected = ?, meta_json = ?, hit_count = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (corrected, meta_json, int(existing["hit_count"] or 0) + 1, now, existing["id"]),
                )
            else:
                conn.execute(
                    """
                    INSERT INTO shadow_corrections
                      (norm_key, original, corrected, source, meta_json, hit_count, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, 1, ?, ?)
                    """,
                    (norm, original, corrected, source, meta_json, now, now),
                )
            conn.commit()
    except Exception:
        logger.exception("shadow cache record failed")
