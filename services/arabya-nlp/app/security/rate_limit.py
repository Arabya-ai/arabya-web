"""Client-IP rate limiter for unauthenticated public visitors (Contabo RAM guard)."""

from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Deque

from fastapi import HTTPException, Request

from config import get_settings


class SlidingWindowRateLimiter:
    """In-process sliding window — no Redis required on Contabo."""

    def __init__(self) -> None:
        self._hits: dict[str, Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window_seconds: int) -> tuple[bool, int]:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            q = self._hits[key]
            while q and q[0] < cutoff:
                q.popleft()
            if len(q) >= limit:
                retry = int(window_seconds - (now - q[0])) + 1
                return False, max(retry, 1)
            q.append(now)
            return True, 0


limiter = SlidingWindowRateLimiter()


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return "unknown"


def is_authenticated(request: Request) -> bool:
    settings = get_settings()
    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        token = auth[7:].strip()
        if token and token in settings.api_token_set:
            return True
    api_key = request.headers.get("x-api-key", "").strip()
    return bool(api_key and api_key in settings.api_token_set)


async def enforce_rate_limit(request: Request) -> None:
    settings = get_settings()
    if not settings.rate_limit_enabled:
        return
    if is_authenticated(request):
        return
    # Health / dashboard static reads stay open for local ops
    path = request.url.path
    if path in ("/health", "/", "/docs", "/openapi.json", "/redoc"):
        return
    if path.startswith("/dashboard/static"):
        return

    ip = client_ip(request)
    allowed, retry_after = limiter.check(
        f"guest:{ip}",
        settings.rate_limit_requests,
        settings.rate_limit_window_seconds,
    )
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail=(
                f"Rate limit exceeded for unauthenticated clients: "
                f"{settings.rate_limit_requests} requests per "
                f"{settings.rate_limit_window_seconds}s. "
                "Provide ARABYA_NLP_API_TOKENS bearer for trusted Contabo clients."
            ),
            headers={"Retry-After": str(retry_after)},
        )
