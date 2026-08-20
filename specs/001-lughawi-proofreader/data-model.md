# Data Model: لغوي

**Feature**: 001-lughawi-proofreader  
**Date**: 2026-08-20

## Entities

### ProofreadRequest (عابر — لا يُحفظ افتراضيًا)

| Field | Type | Notes |
|-------|------|-------|
| text | string | المدخل |
| mode | enum | `proofread` \| `rewrite` \| `tashkeel` \| `tatweel_numbers` |
| tashkeelLevel | enum? | `full` \| `partial` \| `endings` \| `mandatory` |
| rewriteStyle | enum? | `fusha` \| `clearer` \| `shorter` |
| locale | `ar` \| `en` | لغة الواجهة للملاحظات |
| useAi | boolean | طلب طبقة AI |
| provider | string? | مزود BYOK أو مشروع |

### ProofreadResponse

| Field | Type | Notes |
|-------|------|-------|
| original | string | |
| result | string | بعد تطبيق المقبول افتراضيًا أو المسودة الكاملة |
| edits | Edit[] | |
| protectedSpans | ProtectedSpan[] | |
| meta | object | محرك، زمن، هل استُخدم AI، وحدات حصة |

### Edit

| Field | Type | Notes |
|-------|------|-------|
| id | string | |
| start | number | إزاحة Unicode في الأصل |
| end | number | |
| type | enum | `spelling` \| `grammar` \| `morphology` \| `punctuation` \| `style` \| `tashkeel` \| `other` |
| original | string | |
| suggestion | string | |
| ruleId | string? | |
| explanation | string | عربي للمستخدم |
| confidence | number | 0–1 |
| source | enum | `rules` \| `camel` \| `gec` \| `ai` \| `tashkeel` |
| status | enum | `proposed` \| `accepted` \| `rejected` |

### ProtectedSpan

| Field | Type | Notes |
|-------|------|-------|
| start / end | number | |
| reason | `quran` \| `user_lock` | |
| surah | number? | |
| ayah | number? | |
| href | string? | رابط عربیا |

### UserAiCredential (مخزَّن)

| Field | Type | Notes |
|-------|------|-------|
| userId | string | |
| provider | string | `openai` \| `anthropic` \| `google` \| `groq` \| `openrouter` \| … |
| keyCiphertext | blob | مشفّر |
| keyLast4 | string | للعرض |
| isDefault | boolean | |
| lastErrorAt | datetime? | |
| updatedAt | datetime | |

### ProjectQuotaGrant (مخزَّن)

| Field | Type | Notes |
|-------|------|-------|
| userId | string | |
| period | string | `YYYY-MM` |
| limitChars | number | من إعداد مدقق العربية |
| usedChars | number | |
| updatedAt | datetime | |

### RuleNote (ثابت في Git أو JSON)

| Field | Type | Notes |
|-------|------|-------|
| ruleId | string | |
| titleAr / titleEn | string | |
| bodyAr / bodyEn | string | |
| exampleAr | string? | |
| errorTypes | string[] | توافق ARETA/داخلي |

## Relationships

- ProofreadResponse يحتوي edits و protectedSpans.
- Edit قد يشير إلى RuleNote عبر `ruleId`.
- طلب AI يخصم من ProjectQuotaGrant أو يستخدم UserAiCredential.
- لا علاقة تخزين إلزامية بين Session والنص (خصوصية): اختياري لاحقًا بموافقة المستخدم.

## Validation rules

- `start < end` وضمن حدود النص.
- التعديلات المقترحة غير متداخلة بعد دمج المراحل (أو تُحل بأولوية: حماية > قواعد > GEC > AI).
- `usedChars <= limitChars` قبل خصم جديد؛ الخصم ذري لكل طلب.
- لا يُرجع `keyCiphertext` عبر أي API للعميل.
