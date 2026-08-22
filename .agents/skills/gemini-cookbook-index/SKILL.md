---
name: gemini-cookbook-index
description: Arabya routing index for gemini cookbook index — points agents to vendored upstream cookbook/harness paths.
---

# Gemini Cookbook Index (Arabya)

Read from `vendor/agent-ecosystem/gemini-cookbook/`.

## When to use
- Multimodal (audio/image) experiments with Lughawi STT
- Batch + caching for large Quran analysis jobs
- Aligns with `GOOGLE_MODELS_NEWEST_FIRST` in `src/lib/lughawi/ai-gateway.ts`

Always keep newest Flash GA first; auto-fallback on 404 per lughawi-newest-ai-models rule.
