# ADR-0002: Lughawi Contabo-first with optional HF MoA

## Status

Accepted

## Context

Lughawi must work without cloud keys. Owner requested MoA (3 proposers + judge) via Hugging Face and local Ollama as backup.

## Decision

1. **Always-on**: TypeScript rules + arabya-nlp PyArabic/rules on Contabo.
2. **Optional L3 MoA**: HF proposers + Qwen judge when `LUGHAWI_MOA=1` + HF token + signed-in user.
3. **L5 Mastermind**: RAM-aware Ollama gating; shadow cache learning; Ollama judge fallback when HF judge fails.
4. HF token is optional acceleration — never hard-require remote Inference for guest proofread.

## Consequences

- Guests get local stack only (no MoA, no cloud Auto keys).
- Deploy may enable Ollama/neural flags; Mastermind skips Ollama when RAM ≥ 88%.
- Llama HF license may block one proposer; soft-fail continues with remaining proposers.
