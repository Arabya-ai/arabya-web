# Lughawi NLP Sidecar (Contabo)

## سياسة التشغيل (مهمة)

1. **Contabo أساس كامل** — القواعد + نماذج محلية (Alnnahwi / Whisper) مثبتة على السيرفر حتى لا يتوقف العمل إن انتهى توكن HF أو تُعطّل نماذج بعيدة.
2. **Hugging Face تسريع اختياري** — إن وُجد `LUGHAWI_HF_TOKEN` يُجرَّب أولًا لتوفير RAM/CPU.
3. **رجوع تلقائي** — أي فشل HF → Contabo المحلي فورًا.

```text
طلب تدقيق/صوت
   ├─ إن وُجد توكن HF و LUGHAWI_PREFER_HF=1 → جرّب HF
   │     └─ نجح؟ استخدمه
   └─ وإلا / فشل → Contabo المحلي (دائمًا)
```

## Install (كامل على Contabo)

```bash
cd /var/www/arabya-web
bash scripts/contabo-lughawi-sidecar-deps.sh
# اختياري لتوفير الموارد فقط:
# echo 'LUGHAWI_HF_TOKEN=hf_...' >> .env
pm2 restart lughawi-sidecar arabya-web --update-env
curl -s http://127.0.0.1:8091/health | python3 -m json.tool
```

Env defaults written by the deps script:

| Variable | Default | Meaning |
|----------|---------|---------|
| `LUGHAWI_SIDECAR_URL` | `http://127.0.0.1:8091` | Next → sidecar |
| `LUGHAWI_GEC_LOCAL` | `1` | Alnnahwi على Contabo |
| `LUGHAWI_STT_LOCAL` | `1` | faster-whisper على Contabo |
| `LUGHAWI_PREFER_HF` | `1` | جرّب HF أولًا إن وُجد توكن |
| `LUGHAWI_HF_TOKEN` | (optional) | تسريع فقط |
| `LUGHAWI_WHISPER_LOCAL_SIZE` | `medium` | حجم Whisper المحلي |

## Endpoints

| Method | Path | Role |
|--------|------|------|
| GET | `/health` | capabilities + policy |
| POST | `/morph` | CAMeL |
| POST | `/rules-nlp` | Fareh + Ghalatawi + Stanza |
| POST | `/gec` | rules + Alnnahwi (HF→local) |
| POST | `/transcribe` | Whisper (HF→local) |
| POST | `/tashkeel` | CATT or passthrough |
