# Feature Registry — Full Platform (Wave 1)

Last updated: 2026-08-19

## 1) Quran core (Mushaf/Surah/Ayah/I'rab)
- Current:
  - Mushaf page reader + word study dock + ayah i'rab page.
  - Root/juz/search-linked navigation.
- Gaps:
  - Rhetoric layer (بلاغة) not yet full first-class experience.
  - Surah route still partly redirect-oriented (`/surah/[id]` -> mushaf start).

## 2) Search/Root/Juz
- Current:
  - Arabic-normalized search API, root pivoting, root concordance page.
- Gaps:
  - Missing advanced ranking/facets and typo-tolerant alternatives.

## 3) Tafsir/Translations
- Current:
  - Multi-source tafsir/translation APIs with source allowlists.
- Gaps:
  - No source conflict comparison UI (claims diff) yet.

## 4) Adhkar/Duas/Tasbeeh/Qibla/Prayer
- Current:
  - Full adhkar hub + duas explorer + tasbeeh counter.
  - Qibla/prayer APIs with global coordinates support.
  - Reverse geocoding place label integrated.
  - Admin prayer defaults (method/school) integrated.
  - Editorial CRUD override for adhkar/duas integrated (admin+editor).
- Gaps:
  - Notifications/offline prayer cache/streak intelligence still limited.

## 5) Account dashboards
- Current:
  - Role-aware account hub with tahfeez/study/stats/adhkar/favorites.
- Gaps:
  - Advanced personal analytics + onboarding checklists not mature.

## 6) Admin dashboards
- Current:
  - User management, role requests, audit, appearance/services settings.
- Gaps:
  - Bulk moderation workflows and deeper ops reporting are limited.

## 7) Tahfeez
- Current:
  - Recitation training with speech alignment and session portfolio.
- Gaps:
  - Browser speech variability; broader memorization pedagogies can expand.

## 8) Studio + Studio AI
- Current:
  - Ayat studio editor/project shell and AI generation task workflows.
- Gaps:
  - More pro timeline/audio/caption/export observability needed.

## 9) Sync / local-user-db
- Current:
  - Local/worker sync modes with broad user-state persistence.
- Gaps:
  - Cross-mode parity and conflict-resolution semantics need deeper hardening.

## 10) Security posture snapshot
- Strong:
  - Centralized role guards and broad API rate limiting.
- Needs improvement:
  - Editorial upload listing scope, request-size guardrails, safer error shaping.
