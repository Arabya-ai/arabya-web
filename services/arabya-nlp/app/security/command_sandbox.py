"""Hardcoded command whitelist — never execute raw LLM shell strings."""

from __future__ import annotations

import logging
import shlex
import subprocess
from dataclasses import dataclass
from typing import Final

logger = logging.getLogger("arabya_nlp.sandbox")

# Explicit allow-list keyed by stable action ids. Values are argv lists only.
# The DevOps agent maps LLM recommendations → these keys. Nothing else runs.
SAFE_ACTIONS: Final[dict[str, list[str]]] = {
    "status_ollama": ["systemctl", "is-active", "ollama"],
    "restart_ollama": ["systemctl", "restart", "ollama"],
    "status_pm2_nlp": ["pm2", "describe", "arabya-nlp"],
    "restart_pm2_nlp": ["pm2", "restart", "arabya-nlp"],
    "restart_pm2_sidecar": ["pm2", "restart", "lughawi-sidecar"],
    "restart_pm2_web": ["pm2", "restart", "arabya-web"],
    "disk_usage": ["df", "-h", "/"],
    "memory_status": ["free", "-h"],
    "uptime": ["uptime"],
    "clear_nlp_tmp": ["find", "/tmp/arabya-nlp", "-type", "f", "-mtime", "+1", "-delete"],
    "ollama_list": ["ollama", "list"],
}

# Aliases the local reasoner may emit → whitelist keys
ACTION_ALIASES: Final[dict[str, str]] = {
    "systemctl restart ollama": "restart_ollama",
    "restart ollama": "restart_ollama",
    "restart_ollama": "restart_ollama",
    "systemctl is-active ollama": "status_ollama",
    "pm2 restart arabya-nlp": "restart_pm2_nlp",
    "pm2 restart lughawi-sidecar": "restart_pm2_sidecar",
    "pm2 restart arabya-web": "restart_pm2_web",
    "df -h": "disk_usage",
    "free -h": "memory_status",
    "clear cache": "clear_nlp_tmp",
    "clear_tmp": "clear_nlp_tmp",
    "purge tmp": "clear_nlp_tmp",
}


@dataclass(frozen=True)
class SandboxResult:
    action_key: str
    argv: list[str]
    returncode: int
    stdout: str
    stderr: str
    allowed: bool
    message: str

    @property
    def success(self) -> bool:
        return self.allowed and self.returncode == 0


def resolve_action_key(raw: str | None) -> str | None:
    if not raw:
        return None
    cleaned = " ".join(raw.strip().lower().split())
    if cleaned in SAFE_ACTIONS:
        return cleaned
    if cleaned in ACTION_ALIASES:
        return ACTION_ALIASES[cleaned]
    # Try stripping shell noise
    for alias, key in ACTION_ALIASES.items():
        if alias in cleaned:
            return key
    return None


def list_safe_actions() -> dict[str, list[str]]:
    return {k: list(v) for k, v in SAFE_ACTIONS.items()}


def execute_whitelisted(action_key: str, *, dry_run: bool = False) -> SandboxResult:
    """Run exactly one allow-listed argv. Reject anything else."""
    if action_key not in SAFE_ACTIONS:
        return SandboxResult(
            action_key=action_key,
            argv=[],
            returncode=126,
            stdout="",
            stderr="action not in whitelist",
            allowed=False,
            message=f"Rejected unsafe action: {action_key!r}",
        )

    argv = list(SAFE_ACTIONS[action_key])
    rendered = " ".join(shlex.quote(p) for p in argv)

    if dry_run:
        return SandboxResult(
            action_key=action_key,
            argv=argv,
            returncode=0,
            stdout="",
            stderr="",
            allowed=True,
            message=f"Dry-run only: would execute {rendered}",
        )

    logger.info("Executing whitelisted action %s → %s", action_key, argv)
    try:
        completed = subprocess.run(
            argv,
            capture_output=True,
            text=True,
            timeout=90,
            check=False,
            shell=False,
        )
        return SandboxResult(
            action_key=action_key,
            argv=argv,
            returncode=completed.returncode,
            stdout=(completed.stdout or "")[:4000],
            stderr=(completed.stderr or "")[:4000],
            allowed=True,
            message=f"Executed {rendered} (rc={completed.returncode})",
        )
    except FileNotFoundError as exc:
        return SandboxResult(
            action_key=action_key,
            argv=argv,
            returncode=127,
            stdout="",
            stderr=str(exc),
            allowed=True,
            message=f"Binary missing for {rendered}: {exc}",
        )
    except subprocess.TimeoutExpired:
        return SandboxResult(
            action_key=action_key,
            argv=argv,
            returncode=124,
            stdout="",
            stderr="timeout",
            allowed=True,
            message=f"Timeout executing {rendered}",
        )
