# Security Findings — Wave 1

Last updated: 2026-08-19

## Summary
No critical auth bypass discovered in this static pass. Core role guards and API baseline rate limits are broadly in place.

## Medium

1) **Editorial upload listing scope**
- Current upload listing behavior can expose cross-editor metadata visibility.
- Action: restrict default list to uploader scope; keep global list for admin only.

2) **Request-size pressure before deep validation**
- Some JSON-heavy endpoints parse body before downstream length enforcement.
- Action: add pre-parse content-length checks and edge-level body caps.

## Low

3) **Malformed path decode handling**
- Decoding route params in admin handlers may throw on malformed encodings.
- Action: safe decode helper + return 400 instead of 500.

4) **Verbose internal error messages in admin responses**
- Some handlers return raw upstream/internal error text.
- Action: map to stable public error codes and keep verbose detail server-side logs only.

## Mandatory hardening backlog
1. Scope editorial uploads by actor by default.
2. Add request-size guardrail middleware for heavy write endpoints.
3. Standardize error envelope (`code`, `message`, `traceId`) for admin/editor APIs.
4. Add negative-role tests for every privileged route.
