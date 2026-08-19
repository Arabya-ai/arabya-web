# Expansion Benchmarks & Hybrid Integration Roadmap

Last updated: 2026-08-19

## Why this file
Maps each Arabya module to external reference projects/datasets that can expand capabilities without replacing existing core behavior.

## A) Quran linguistic depth (I'rab word-by-word, ayah-by-ayah)

### Candidate sources
1. **Quranic Arabic Corpus (QAC)** — morphology/syntax/dependency focus.
2. **MASAQ dataset** — large morpho-syntactic annotations with modern packaging.
3. Tanzil-based structured corpora for canonical text alignment.

### Integration policy
- Keep Arabya text pipeline authoritative.
- Import analysis as **claims layer** with explicit source attribution.
- Support multi-source conflict display instead of silent overwrite.

### Deliverables
- `irab_claims` model (word + ayah level)
- source confidence + provenance fields
- side-by-side source comparison UI for editorial review

## B) Prayer/Qibla expansion

### Benchmark inspirations
- Athan-style method presets and reminders
- location-aware schedules + offline fallback cache

### Arabya upgrades
- per-user method/school overrides (after admin defaults baseline)
- optional reminder engine with safe defaults
- monthly prayer calendar exports

## C) Adhkar/Duas expansion

### Benchmark inspirations
- curated devotional apps with category/streak/progress loops

### Arabya upgrades
- editor/admin moderation queues for submissions
- versioned content history + rollback
- multilingual dua metadata enrichment

## D) Tahfeez expansion

### Benchmark inspirations
- recitation-feedback and memorization products (mistake heatmaps, spaced repetition)

### Arabya upgrades
- surah-plan scheduler
- weak-word revision queue
- advanced coach mode (repeat segments, slowdown, target words)

## E) Studio Pro expansion

### Benchmark inspirations
- browser-native NLE projects (multi-track, keyframes, waveforms, captions, export presets)

### Arabya upgrades
- timeline precision tools (ripple, slip, markers)
- caption tracks and style presets
- richer export matrix (bitrate/codec presets)
- render performance uplift (worker/off-main-thread)

## F) Admin/Account operations

### Benchmark inspirations
- modern ops dashboards with actionable audit trails

### Arabya upgrades
- per-feature telemetry boards
- role-policy diagnostics
- safer bulk moderation flows

## Rollout strategy
1. Feature flags per subsystem
2. pilot cohort per module
3. compatibility tests before full enablement
4. fast rollback via flag, not data deletion
