"""API routers — health, proofread, transcribe, dashboard analytics."""

from __future__ import annotations

from fastapi import APIRouter, Depends, File, Request, UploadFile
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.agent.devops_agent import agent_singleton, run_agent_once_async
from app.database import get_db
from app.pipeline.proofreader import proofread_text
from app.schemas import (
    AnalyticsSummary,
    HealthResponse,
    ProofreadRequest,
    ProofreadResponse,
    TranscribeResponse,
)
from app.security.command_sandbox import list_safe_actions
from app.security.rate_limit import client_ip, enforce_rate_limit
from app.services.audio_processor import process_media_bytes
from app.services.metrics import analytics_payload, collect_health

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return collect_health()


@router.get("/")
async def root() -> dict:
    return {
        "service": "arabya-nlp",
        "docs": "/docs",
        "health": "/health",
        "dashboard": "/dashboard",
        "layers": [
            "proofread (Layer 1)",
            "transcribe (Layer 2)",
            "devops-agent (Layer 3)",
            "dashboard (Layer 4)",
        ],
    }


@router.post("/v1/proofread", response_model=ProofreadResponse)
async def proofread(
    body: ProofreadRequest,
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(enforce_rate_limit),
) -> ProofreadResponse:
    return await proofread_text(
        body.text,
        preserve_diacritics=body.preserve_diacritics,
        skip_llm=body.skip_llm,
        db=db,
        client_ip=client_ip(request),
    )


@router.post("/v1/transcribe", response_model=TranscribeResponse)
async def transcribe(
    request: Request,
    file: UploadFile = File(...),
    skip_llm: bool = False,
    db: Session = Depends(get_db),
    _: None = Depends(enforce_rate_limit),
) -> TranscribeResponse:
    data = await file.read()
    return await process_media_bytes(
        data,
        file.filename or "upload.bin",
        db=db,
        client_ip=client_ip(request),
        skip_llm=skip_llm,
    )


@router.get("/v1/analytics", response_model=AnalyticsSummary)
async def analytics(
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(enforce_rate_limit),
) -> AnalyticsSummary:
    payload = analytics_payload(db)
    return AnalyticsSummary(**payload)


@router.get("/v1/agent/audit")
async def agent_audit(
    request: Request,
    db: Session = Depends(get_db),
    _: None = Depends(enforce_rate_limit),
    limit: int = 50,
) -> dict:
    from app.models import AgentAuditLog

    rows = (
        db.query(AgentAuditLog)
        .order_by(AgentAuditLog.detected_at.desc())
        .limit(min(max(limit, 1), 200))
        .all()
    )
    return {
        "items": [
            {
                "id": r.id,
                "detected_at": r.detected_at,
                "anomaly_type": r.anomaly_type,
                "error_excerpt": r.error_excerpt,
                "ai_analysis": r.ai_analysis,
                "action_key": r.action_key,
                "command_executed": r.command_executed,
                "result": r.result,
                "success": r.success,
                "executed": r.executed,
            }
            for r in rows
        ]
    }


@router.post("/v1/agent/tick")
async def agent_tick(
    request: Request,
    _: None = Depends(enforce_rate_limit),
) -> dict:
    """Manual DevOps tick (ops / testing). Still respects whitelist sandbox."""
    return await run_agent_once_async()


@router.get("/v1/agent/safe-actions")
async def safe_actions() -> dict:
    return {"actions": list_safe_actions(), "auto_execute": agent_singleton.settings.devops_auto_execute}


DASHBOARD_HTML = """<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Arabya NLP — لوحة Contabo</title>
  <style>
    :root {
      --brand: #0d9488;
      --brand-deep: #0f766e;
      --brand-soft: #ccfbf1;
      --surface: #f0fdfa;
      --ink: #134e4a;
      --red: #b91c1c;
      --green: #047857;
      --yellow: #a16207;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: "Segoe UI", "Noto Sans Arabic", Tahoma, sans-serif;
      color: var(--ink);
      background:
        radial-gradient(ellipse 80% 50% at 100% 0%, rgba(13,148,136,.18), transparent 55%),
        radial-gradient(ellipse 60% 40% at 0% 100%, rgba(15,118,110,.12), transparent 50%),
        linear-gradient(165deg, #ecfeff 0%, var(--surface) 45%, #f8fafc 100%);
      min-height: 100vh;
    }
    header {
      padding: 1.75rem 1.5rem 1rem;
      border-bottom: 1px solid rgba(13,148,136,.2);
    }
    header h1 {
      margin: 0;
      font-size: clamp(1.6rem, 3vw, 2.2rem);
      letter-spacing: -0.02em;
      color: var(--brand-deep);
    }
    header p { margin: .4rem 0 0; opacity: .85; max-width: 40rem; }
    main { padding: 1.25rem 1.5rem 2.5rem; display: grid; gap: 1.25rem; }
    .row { display: grid; gap: 1rem; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
    .stat {
      padding: 1rem 1.1rem;
      border-radius: 0;
      border-inline-start: 3px solid var(--brand);
      background: rgba(255,255,255,.55);
    }
    .stat strong { display: block; font-size: 1.5rem; margin-top: .25rem; }
    .pill {
      display: inline-flex; align-items: center; gap: .4rem;
      font-weight: 600; font-size: .95rem;
    }
    .dot { width: .7rem; height: .7rem; border-radius: 50%; display: inline-block; }
    .dot.green { background: var(--green); }
    .dot.red { background: var(--red); }
    .dot.yellow { background: var(--yellow); }
    section h2 { margin: 0 0 .75rem; font-size: 1.15rem; color: var(--brand-deep); }
    table {
      width: 100%; border-collapse: collapse; font-size: .88rem;
      background: rgba(255,255,255,.65);
    }
    th, td {
      text-align: right; padding: .55rem .65rem;
      border-bottom: 1px solid rgba(13,148,136,.15);
      vertical-align: top;
    }
    th { background: var(--brand-soft); color: var(--brand-deep); }
    .muted { opacity: .75; font-size: .85rem; }
    button {
      background: var(--brand); color: #fff; border: 0;
      padding: .55rem 1rem; cursor: pointer; font: inherit;
    }
    button:hover { background: var(--brand-deep); }
  </style>
</head>
<body>
  <header>
    <h1>عربية NLP</h1>
    <p>لوحة مراقبة Contabo الذاتية — صحة الخادم، وكيل DevOps، وإحصاءات لغوية.</p>
  </header>
  <main>
    <div class="row" id="health-row"></div>
    <div class="row" id="metrics-row"></div>
    <section>
      <h2>سجل إصلاحات الوكيل</h2>
      <p class="muted">آخر الإجراءات الآمنة المنفّذة أو المقترحة (قائمة أوامر مُبيّضة فقط).</p>
      <div style="overflow:auto">
        <table>
          <thead>
            <tr>
              <th>الوقت</th><th>الخطأ</th><th>تحليل الذكاء</th>
              <th>الأمر</th><th>النتيجة</th>
            </tr>
          </thead>
          <tbody id="audit-body"><tr><td colspan="5">جارٍ التحميل…</td></tr></tbody>
        </table>
      </div>
    </section>
    <section>
      <h2>أكثر الأخطاء اللغوية تكرارًا</h2>
      <div style="overflow:auto">
        <table>
          <thead><tr><th>النوع</th><th>الأصل</th><th>الاقتراح</th><th>العدد</th></tr></thead>
          <tbody id="errors-body"><tr><td colspan="4">جارٍ التحميل…</td></tr></tbody>
        </table>
      </div>
      <p style="margin-top:1rem">
        <button type="button" id="tick-btn">تشغيل فحص الوكيل الآن</button>
        <span class="muted" id="tick-msg"></span>
      </p>
    </section>
  </main>
  <script>
    function esc(s) {
      return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    }
    async function load() {
      const health = await fetch('/health').then(r => r.json());
      const analytics = await fetch('/v1/analytics').then(r => r.json());
      document.getElementById('health-row').innerHTML = (health.components || []).map(c => `
        <div class="stat">
          <span class="pill"><span class="dot ${esc(c.status)}"></span>${esc(c.name)}</span>
          <strong>${esc(c.status)}</strong>
          <span class="muted">${esc(c.detail)}</span>
        </div>`).join('');
      document.getElementById('metrics-row').innerHTML = `
        <div class="stat">CPU<strong>${health.cpu_percent?.toFixed?.(1) ?? '—'}%</strong></div>
        <div class="stat">RAM<strong>${health.ram_percent?.toFixed?.(1) ?? '—'}%</strong></div>
        <div class="stat">Disk<strong>${health.disk_percent?.toFixed?.(1) ?? '—'}%</strong></div>
        <div class="stat">كلمات معالجة<strong>${analytics.total_words_processed ?? 0}</strong></div>
        <div class="stat">دقائق صوت<strong>${analytics.total_audio_minutes ?? 0}</strong></div>
        <div class="stat">مهام تدقيق<strong>${analytics.total_proofread_jobs ?? 0}</strong></div>`;
      const audits = analytics.recent_agent_actions || [];
      document.getElementById('audit-body').innerHTML = audits.length ? audits.map(a => `
        <tr>
          <td>${esc(a.detected_at)}</td>
          <td>${esc(a.anomaly_type)}<div class="muted">${esc((a.error_excerpt||'').slice(0,120))}</div></td>
          <td>${esc((a.ai_analysis||'').slice(0,180))}</td>
          <td><code>${esc(a.command_executed)}</code></td>
          <td>${a.success ? '✓' : '✗'} ${esc((a.result||'').slice(0,120))}</td>
        </tr>`).join('') : '<tr><td colspan="5">لا سجلات بعد</td></tr>';
      const errs = analytics.top_errors || [];
      document.getElementById('errors-body').innerHTML = errs.length ? errs.map(e => `
        <tr>
          <td>${esc(e.error_type)}</td>
          <td>${esc(e.original)}</td>
          <td>${esc(e.suggestion)}</td>
          <td>${esc(e.hit_count)}</td>
        </tr>`).join('') : '<tr><td colspan="4">لا بيانات بعد</td></tr>';
    }
    document.getElementById('tick-btn').onclick = async () => {
      const msg = document.getElementById('tick-msg');
      msg.textContent = '…';
      try {
        const res = await fetch('/v1/agent/tick', { method: 'POST' });
        const data = await res.json();
        msg.textContent = `anomalies=${(data.anomalies||[]).join(',')||'none'}`;
        await load();
      } catch (e) {
        msg.textContent = String(e);
      }
    };
    load();
    setInterval(load, 15000);
  </script>
</body>
</html>
"""


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard() -> HTMLResponse:
    return HTMLResponse(DASHBOARD_HTML)
