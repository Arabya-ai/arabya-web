# Contract: لغوي API

Base (Next gateway): `/api/lughawi`  
Engine (internal): `LUGHAWI_ENGINE_URL` e.g. `http://127.0.0.1:8091`

All JSON; UTF-8; Arabic explanations default.

---

## `POST /api/lughawi/proofread`

تدقيق محلي/هجين. لا يتطلب حسابًا للمسار الأساسي.

### Request

```json
{
  "text": "انا ذهب الى المدرسه",
  "mode": "proofread",
  "locale": "ar",
  "useAi": false
}
```

### Response `200`

```json
{
  "original": "انا ذهب الى المدرسه",
  "result": "أنا ذهب إلى المدرسة",
  "edits": [
    {
      "id": "e1",
      "start": 0,
      "end": 3,
      "type": "spelling",
      "original": "انا",
      "suggestion": "أنا",
      "ruleId": "hamza-ana",
      "explanation": "الضمائر المنفصلة تُكتب بهمزة قطع: أنا.",
      "confidence": 0.92,
      "source": "rules",
      "status": "proposed"
    }
  ],
  "protectedSpans": [],
  "meta": {
    "engine": "lughawi-local",
    "usedAi": false,
    "quotaCharged": 0
  }
}
```

### Errors

- `400` نص فارغ / أطول من الحد
- `429` حد معدل للضيف
- `502` المحرك المحلي غير متاح

---

## `POST /api/lughawi/rewrite`

يتطلب جلسة مستخدم. يستهلك حصة أو BYOK.

### Request

```json
{
  "text": "…",
  "style": "fusha",
  "provider": "openai"
}
```

### Response `200`

مثل proofread مع `type: "style"` و`meta.usedAi: true`.

### Errors

- `401` غير مسجّل
- `402` نفدت الحصة ولا مفتاح (`code: quota_exhausted`)
- `502` فشل المزود

---

## `POST /api/lughawi/tashkeel`

```json
{ "text": "…", "level": "full", "useAi": false }
```

يفضّل المحرك المحلي؛ AI احتياطي اختياري.

---

## `GET /api/lughawi/quota`

يتطلب مستخدمًا.

```json
{
  "period": "2026-08",
  "limitChars": 30000,
  "usedChars": 1200,
  "remainingChars": 28800
}
```

---

## `GET /api/lughawi/providers`

قائمة المزودين المفعّلين + هل للمستخدم مفتاح محفوظ (بدون كشف المفتاح).

```json
{
  "providers": [
    { "id": "openai", "label": "OpenAI", "configured": true, "last4": "ab12" },
    { "id": "anthropic", "label": "Anthropic", "configured": false }
  ],
  "defaultProvider": "openai"
}
```

---

## `PUT /api/lughawi/providers/:id/key`

```json
{ "apiKey": "sk-…" }
```

يخزّن مشفّرًا؛ الاستجابة `{ "ok": true, "last4": "…" }` فقط.

---

## `DELETE /api/lughawi/providers/:id/key`

يحذف مفتاح المستخدم لهذا المزود.

---

## Internal engine: `POST /v1/proofread`

يُستدعى من Next فقط (شبكة محلية). نفس شكل Request/Response للتدقيق دون منطق الحصة.
