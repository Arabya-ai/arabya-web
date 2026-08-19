# Technical Findings — Wave 1

Last updated: 2026-08-19

## High

1) **Localization inconsistency in qibla API label**
- `directionLabel` returned in Arabic wording regardless of requested language.
- Impact: mixed-language UX in English mode.

2) **Reverse geocode on critical path**
- Prayer/qibla responses await external reverse-geocode call.
- Impact: tail-latency sensitivity to upstream delays.

## Medium

3) **Duplicated location state machines**
- Similar coordinate/geolocation logic duplicated in `PrayerTimesCard` and `QiblaCompass`.
- Impact: behavior drift and higher regression risk.

4) **Mount-only locale loading pattern**
- Initial fetch behavior in prayer card intentionally suppresses effect deps.
- Impact: potential stale data after locale/runtime context switches.

5) **Heavy client export paths**
- Studio export code contains CPU-intensive loops on client side.
- Impact: UI jank under large timelines/media.

## Low

6) **In-memory rate-limit bucket implementation**
- Array filtering on each call is acceptable now but less scalable under load.

## Recommended remediation order
1. Normalize localization in qibla/prayer payload display strategy.
2. Make reverse geocoding non-blocking or cache-first on fast path.
3. Extract shared hook for location mode logic.
4. Workerize heavy export processing and unify exporter code paths.
5. Add structured API performance telemetry for prayer/qibla/studio endpoints.
