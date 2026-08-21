# Design Consistency Findings — Wave 1

Last updated: 2026-08-19

## High

1) **Parallel token systems across app surfaces**
- Core app and studio surfaces use different design-token vocabularies.
- Risk: visual drift and harder dark/light parity governance.

## Medium

2) **Forced-dark patterns inside some studio shells**
- Some panels preserve dark treatment independent of broader day mode.
- Risk: perceived inconsistency with Arabya light theme pages.

3) **Hardcoded colors in isolated components**
- Fixed hex colors appear in scattered components instead of semantic tokens.
- Risk: contrast regressions and harder re-theming.

## Low

4) **UX pattern split across Ayat Studio vs MPT Studio** — resolved: MPT `/studio/ai` removed; only ayat studio remains.

## Design normalization plan (short)
1. Create one canonical token map for all app surfaces.
2. Add studio token bridge layer to map legacy variables into Arabya semantics.
3. Replace hardcoded UI colors with semantic status tokens.
4. Define shared component primitives for panel/header/actions across account/admin/studio.
