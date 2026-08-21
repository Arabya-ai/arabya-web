"""
Layer 3 — Autonomous AI DevOps agent (self-healing, Contabo-local).

Every N seconds:
  1) Collect CPU/RAM/disk + last server.log lines + Ollama status
  2) Detect anomalies
  3) Ask local Ollama for a *whitelist action key* (never raw shell)
  4) Optionally execute via command sandbox
  5) Persist human-readable audit row
"""

from __future__ import annotations

import asyncio
import logging
import threading
from pathlib import Path
from typing import Any

import psutil

from app.database import session_scope
from app.models import AgentAuditLog, MetricSnapshot
from app.security.command_sandbox import (
    execute_whitelisted,
    list_safe_actions,
    resolve_action_key,
)
from app.services.ollama_client import OllamaClient, parse_json_object
from config import Settings, get_settings

logger = logging.getLogger("arabya_nlp.devops_agent")

DEVOPS_SYSTEM = """أنت مهندس DevOps خبير لخادم Contabo يعمل عليه Arabya NLP (FastAPI + Ollama).
حلّل سجلات الأخطاء وقدّم تشخيصًا موجزًا بالعربية.
يجب أن يكون الحقل action_key واحدًا فقط من قائمة الإجراءات الآمنة المسموحة.
لا تخترع أوامر shell حرة. أعد JSON فقط:
{"analysis":"...","action_key":"restart_ollama|status_ollama|restart_pm2_nlp|disk_usage|memory_status|clear_nlp_tmp|none","rationale":"..."}
"""


class DevOpsAgent:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._last_tick: dict[str, Any] = {}
        self.running = False
        self.last_error: str | None = None

    @property
    def status(self) -> str:
        if not self.settings.devops_agent_enabled:
            return "disabled"
        return "green" if self.running and not self.last_error else ("yellow" if self.running else "red")

    def start(self) -> None:
        if not self.settings.devops_agent_enabled:
            logger.info("DevOps agent disabled by config")
            return
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._loop, name="arabya-devops-agent", daemon=True)
        self._thread.start()
        self.running = True
        logger.info(
            "DevOps agent started (interval=%ss, auto_execute=%s)",
            self.settings.devops_agent_interval_seconds,
            self.settings.devops_auto_execute,
        )

    def stop(self) -> None:
        self._stop.set()
        self.running = False

    def _loop(self) -> None:
        while not self._stop.is_set():
            try:
                self.tick()
                self.last_error = None
            except Exception as exc:
                self.last_error = f"{type(exc).__name__}: {exc}"
                logger.exception("DevOps agent tick failed")
            self._stop.wait(self.settings.devops_agent_interval_seconds)

    def collect_metrics(self) -> dict[str, Any]:
        cpu = float(psutil.cpu_percent(interval=0.2))
        ram = float(psutil.virtual_memory().percent)
        disk = float(psutil.disk_usage("/").percent)
        ollama = OllamaClient(self.settings).is_up_sync()
        log_tail = self._read_log_tail(100)
        return {
            "cpu_percent": cpu,
            "ram_percent": ram,
            "disk_percent": disk,
            "ollama_up": ollama,
            "log_tail": log_tail,
        }

    def _read_log_tail(self, n: int) -> str:
        path = Path(self.settings.server_log_path)
        if not path.is_file():
            return ""
        try:
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
            return "\n".join(lines[-n:])
        except OSError as exc:
            return f"<log read error: {exc}>"

    def detect_anomalies(self, metrics: dict[str, Any]) -> list[dict[str, str]]:
        anomalies: list[dict[str, str]] = []
        if metrics["cpu_percent"] >= self.settings.cpu_alert_percent:
            anomalies.append(
                {
                    "type": "high_cpu",
                    "excerpt": f"CPU {metrics['cpu_percent']:.1f}%",
                }
            )
        if metrics["ram_percent"] >= self.settings.ram_alert_percent:
            anomalies.append(
                {
                    "type": "high_ram",
                    "excerpt": f"RAM {metrics['ram_percent']:.1f}%",
                }
            )
        if metrics["disk_percent"] >= self.settings.disk_alert_percent:
            anomalies.append(
                {
                    "type": "high_disk",
                    "excerpt": f"Disk {metrics['disk_percent']:.1f}%",
                }
            )
        if not metrics["ollama_up"]:
            anomalies.append(
                {
                    "type": "ollama_down",
                    "excerpt": "Ollama connection failure/timeout on localhost:11434",
                }
            )
        log_tail = metrics.get("log_tail") or ""
        lowered = log_tail.lower()
        for marker in ("traceback", "internal server error", "error 500", "uvicorn.error"):
            if marker in lowered:
                anomalies.append(
                    {
                        "type": "fastapi_error",
                        "excerpt": log_tail[-1500:],
                    }
                )
                break
        return anomalies

    def diagnose(self, anomaly: dict[str, str]) -> dict[str, Any]:
        allowed = ", ".join(sorted(list_safe_actions().keys())) + ", none"
        prompt = (
            f"نوع الشذوذ: {anomaly['type']}\n"
            f"المقتطف:\n{anomaly['excerpt'][-2000:]}\n\n"
            f"الإجراءات المسموحة فقط: {allowed}\n"
            "اختر action_key واحدًا مناسبًا أو none."
        )
        result = OllamaClient(self.settings).generate_sync(
            model=self.settings.ollama_devops_model,
            prompt=prompt,
            system=DEVOPS_SYSTEM,
            format_json=True,
        )
        if not result.get("ok"):
            # Deterministic local fallbacks when Ollama itself is down
            fallback_key = {
                "ollama_down": "restart_ollama",
                "high_disk": "clear_nlp_tmp",
                "high_ram": "memory_status",
                "high_cpu": "uptime",
                "fastapi_error": "restart_pm2_nlp",
            }.get(anomaly["type"], "none")
            return {
                "analysis": f"Fallback diagnosis (Ollama unavailable): {result.get('error')}",
                "action_key": fallback_key,
                "rationale": "deterministic fallback",
            }

        parsed = parse_json_object(str(result.get("response") or "")) or {}
        action_key = resolve_action_key(str(parsed.get("action_key") or ""))
        if action_key is None:
            # Accept explicit none
            raw = str(parsed.get("action_key") or "none").strip().lower()
            action_key = None if raw in {"none", "", "null"} else None
        return {
            "analysis": str(parsed.get("analysis") or result.get("response") or "")[:4000],
            "action_key": action_key or "none",
            "rationale": str(parsed.get("rationale") or "")[:1000],
        }

    def tick(self) -> dict[str, Any]:
        metrics = self.collect_metrics()
        anomalies = self.detect_anomalies(metrics)

        with session_scope() as db:
            db.add(
                MetricSnapshot(
                    cpu_percent=metrics["cpu_percent"],
                    ram_percent=metrics["ram_percent"],
                    disk_percent=metrics["disk_percent"],
                    ollama_up=bool(metrics["ollama_up"]),
                    fastapi_ok=True,
                    agent_ok=True,
                )
            )

        actions_taken: list[dict[str, Any]] = []
        for anomaly in anomalies:
            diagnosis = self.diagnose(anomaly)
            action_key = diagnosis.get("action_key") or "none"
            executed = False
            success = False
            command = ""
            result_msg = "no action"

            if action_key and action_key != "none":
                dry = not self.settings.devops_auto_execute
                sandbox = execute_whitelisted(action_key, dry_run=dry)
                executed = not dry and sandbox.allowed
                success = sandbox.success if not dry else True
                command = " ".join(sandbox.argv) if sandbox.argv else action_key
                result_msg = sandbox.message
                if sandbox.stdout:
                    result_msg += f" | stdout={sandbox.stdout[:500]}"
                if sandbox.stderr:
                    result_msg += f" | stderr={sandbox.stderr[:500]}"
            else:
                command = "(none)"
                result_msg = "AI recommended no automated action"
                success = True

            with session_scope() as db:
                db.add(
                    AgentAuditLog(
                        anomaly_type=anomaly["type"],
                        error_excerpt=anomaly["excerpt"][:4000],
                        ai_analysis=str(diagnosis.get("analysis") or ""),
                        action_key=action_key,
                        command_executed=command,
                        result=result_msg[:4000],
                        success=success,
                        executed=executed,
                    )
                )

            actions_taken.append(
                {
                    "anomaly": anomaly["type"],
                    "action_key": action_key,
                    "executed": executed,
                    "success": success,
                    "result": result_msg,
                }
            )

        self._last_tick = {
            "metrics": {k: v for k, v in metrics.items() if k != "log_tail"},
            "anomalies": [a["type"] for a in anomalies],
            "actions": actions_taken,
        }
        return self._last_tick

    def last_tick(self) -> dict[str, Any]:
        return dict(self._last_tick)


# Process-wide singleton used by FastAPI lifespan
agent_singleton = DevOpsAgent()


async def run_agent_once_async() -> dict[str, Any]:
    return await asyncio.to_thread(agent_singleton.tick)
