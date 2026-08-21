"""
Optional Streamlit dashboard (Layer 4 alternative UI).

Run on Contabo:
  streamlit run app/dashboard/streamlit_app.py --server.port 8501 --server.address 127.0.0.1
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import httpx
import streamlit as st

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

API = os.environ.get("ARABYA_NLP_DASHBOARD_API", "http://127.0.0.1:8092")

st.set_page_config(page_title="Arabya NLP Contabo", layout="wide", page_icon="ع")
st.title("عربية NLP — Contabo")
st.caption("مراقبة مباشرة للخادم المحلي فقط (لا خدمات سحابية).")


@st.cache_data(ttl=10)
def fetch_json(path: str) -> dict:
    with httpx.Client(timeout=10.0) as client:
        res = client.get(f"{API}{path}")
        res.raise_for_status()
        return res.json()


try:
    health = fetch_json("/health")
    analytics = fetch_json("/v1/analytics")
except Exception as exc:
    st.error(f"تعذّر الاتصال بـ FastAPI على {API}: {exc}")
    st.stop()

c1, c2, c3, c4 = st.columns(4)
c1.metric("CPU %", f"{health.get('cpu_percent', 0):.1f}")
c2.metric("RAM %", f"{health.get('ram_percent', 0):.1f}")
c3.metric("كلمات", analytics.get("total_words_processed", 0))
c4.metric("دقائق صوت", analytics.get("total_audio_minutes", 0))

st.subheader("حالة المكوّنات")
for comp in health.get("components", []):
    color = {"green": "🟢", "red": "🔴", "yellow": "🟡"}.get(comp.get("status"), "⚪")
    st.write(f"{color} **{comp.get('name')}** — {comp.get('status')} — {comp.get('detail')}")

st.subheader("سجل الوكيل")
st.dataframe(analytics.get("recent_agent_actions") or [], use_container_width=True)

st.subheader("الأخطاء اللغوية الأكثر تكرارًا")
st.dataframe(analytics.get("top_errors") or [], use_container_width=True)
