/**
 * Media Session API helpers — lock-screen / notification controls on supporting
 * browsers and a foundation for future native background audio.
 */

export type MediaSessionMeta = {
  title: string;
  artist?: string;
  album?: string;
};

export type MediaSessionHandlers = {
  onPlay?: () => void;
  onPause?: () => void;
  onStop?: () => void;
  onSeekBackward?: () => void;
  onSeekForward?: () => void;
};

export function canUseMediaSession(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaSession !== "undefined"
  );
}

function bindHandlers(handlers: MediaSessionHandlers): void {
  const bind = (
    action: MediaSessionAction,
    handler: (() => void) | undefined,
  ) => {
    try {
      navigator.mediaSession.setActionHandler(action, handler ?? null);
    } catch {
      /* action unsupported on this browser */
    }
  };

  bind("play", handlers.onPlay);
  bind("pause", handlers.onPause);
  bind("stop", handlers.onStop);
  bind("seekbackward", handlers.onSeekBackward);
  bind("seekforward", handlers.onSeekForward);
}

/**
 * Update metadata + playing state.
 * Pass `handlers` only when (re)binding controls — omit to keep existing handlers.
 */
export function setMediaSessionPlaying(
  meta: MediaSessionMeta,
  handlers?: MediaSessionHandlers,
): void {
  if (!canUseMediaSession()) return;
  try {
    navigator.mediaSession.metadata = new MediaMetadata({
      title: meta.title,
      artist: meta.artist ?? "Arabya",
      album: meta.album ?? "Arabya Mushaf",
    });
    navigator.mediaSession.playbackState = "playing";
    if (handlers) bindHandlers(handlers);
  } catch {
    /* ignore */
  }
}

export function setMediaSessionPaused(): void {
  if (!canUseMediaSession()) return;
  try {
    navigator.mediaSession.playbackState = "paused";
  } catch {
    /* ignore */
  }
}

export function clearMediaSession(): void {
  if (!canUseMediaSession()) return;
  try {
    navigator.mediaSession.playbackState = "none";
    navigator.mediaSession.metadata = null;
    bindHandlers({});
  } catch {
    /* ignore */
  }
}
