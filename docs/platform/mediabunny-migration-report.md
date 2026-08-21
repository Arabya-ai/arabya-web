# Mediabunny migration — architecture progress report

**Branch:** `cursor/migrate-mediabunny-muxer-51a7`  
**Date:** 2026-08-21  
**Status:** Complete (CI pending)

## 1. Dependency changes

| Action | Package | Notes |
|--------|---------|-------|
| Removed | `mp4-muxer` | Deprecated; superseded by Mediabunny |
| Removed | `webm-muxer` | Deprecated; superseded by Mediabunny |
| Added | `mediabunny@^1.55.1` | Official successor; tree-shakable MP4 + WebM mux |

`package-lock.json` no longer references either deprecated muxer.

## 2. New shared architecture

```
WebCodecs VideoEncoder / AudioEncoder
        │  Encoded*Chunk callbacks
        ▼
createMediabunnyMuxSession()   ← src/lib/media-export/mediabunny-mux.ts
        │  EncodedPacket.fromEncodedChunk + promise chain (backpressure)
        ▼
Output + BufferTarget
   ├─ Mp4OutputFormat (fastStart: in-memory) → AVC + AAC
   └─ WebMOutputFormat                       → VP9 + Opus
        ▼
ArrayBuffer → Blob (video/mp4 | video/webm)
```

### Public helper API
- `createMediabunnyMuxSession({ container, frameRate })`
- `addVideoChunk` / `addAudioChunk` (sync enqueue → async Mediabunny writes)
- `finalize()` → `ArrayBuffer`
- `mimeForContainer(container)`

## 3. Call sites updated

| File | Role | Before | After |
|------|------|--------|-------|
| `src/lib/media-export/video-export.ts` | `/create` ayah video | `mp4-muxer` Muxer | Mediabunny MP4 session |
| `src/ayat-studio/lib/video-export.ts` | `/studio` export | `mp4-muxer` + dynamic `webm-muxer` | Single Mediabunny session (`mp4` \| `webm`) |
| `src/lib/media-export/mediabunny-mux.ts` | Shared mux | — | New |
| `docs/platform/contabo-npm-tar-enoent-ar.md` | Ops note | “ignore deprecation” | Points to Mediabunny |

UI consumers (`CreateVideoClient`, `Editor.tsx`) unchanged — still call `exportProjectToVideo`.

## 4. Encoding stack (unchanged layers)

Still client-side WebCodecs (no Contabo FFmpeg dependency for this path):
1. Canvas frames → `VideoEncoder` (AVC or VP9)
2. AudioBuffer chunks → `AudioEncoder` (AAC or Opus)
3. Mux only swapped to Mediabunny

## 5. Verification

- Vitest: `mediabunny-mux.test.ts` + `video-export-audio.test.ts` — passed
- `tsc --noEmit` — passed
- Repo grep: no runtime imports of `mp4-muxer` / `webm-muxer`

## 6. Contabo deploy (after merge)

```bash
cd /var/www/arabya-web && git fetch origin main && git checkout main \
  && git pull --ff-only origin main && bash scripts/contabo-deploy.sh
```

Muxing runs in the visitor’s browser; Contabo only needs a clean `npm ci` without deprecated muxer warnings.

## 7. Out of scope

- Server-side Money Printer Turbo encoding (**removed from product**; ayah studio uses Mediabunny in-browser)
- Full browser E2E encode of a long ayah video (requires Chrome WebCodecs UI)
