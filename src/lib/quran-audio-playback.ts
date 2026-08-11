/**
 * Low-level HTMLAudioElement helpers for mushaf playback.
 * Kept free of React so we can unit-test gesture/load races.
 */

export type PlayClipResult = "ok" | "error" | "stopped";

const META_TIMEOUT_MS = 12000;

/** Tiny silent WAV — unlocks autoplay during a user gesture. */
const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

export function hardStopMedia(audio: HTMLAudioElement | null): void {
  if (!audio) return;
  try {
    audio.pause();
    audio.ontimeupdate = null;
    audio.onended = null;
    audio.onerror = null;
    audio.removeAttribute("src");
    audio.load();
  } catch {
    /* ignore */
  }
}

/**
 * Call synchronously inside a click/tap handler (before any await).
 * Starts a muted silent play() then pauses so autoplay stays unlocked
 * without leaving a clip that can end mid-await and fire Media Session pause.
 */
export function unlockAudioElement(audio: HTMLAudioElement): void {
  try {
    audio.muted = true;
    audio.src = SILENT_WAV;
    const playPromise = audio.play();
    try {
      audio.pause();
    } catch {
      /* ignore */
    }
    void playPromise.catch(() => undefined);
  } catch {
    try {
      audio.muted = false;
    } catch {
      /* ignore */
    }
  }
}

async function safePlay(audio: HTMLAudioElement): Promise<boolean> {
  try {
    await audio.play();
    return true;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      await new Promise((r) => setTimeout(r, 40));
      try {
        await audio.play();
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

/**
 * Load `src` and play until ended, error, or `shouldStop()`.
 */
export async function playClipToEnd(
  audio: HTMLAudioElement,
  src: string,
  opts: {
    shouldStop: () => boolean;
    playbackRate?: number;
    startAtSec?: number;
    stopAtSec?: number;
    onTime?: (currentTime: number, duration: number) => void;
    session?: number;
    isCurrent?: (session: number) => boolean;
  },
): Promise<PlayClipResult> {
  if (opts.shouldStop()) return "stopped";
  const session = opts.session;
  const alive = () =>
    !opts.shouldStop() &&
    (session === undefined || !opts.isCurrent || opts.isCurrent(session));

  if (!alive()) return "stopped";

  const rate = opts.playbackRate ?? 1;
  audio.playbackRate = rate;
  audio.muted = false;

  const metaOk = await new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("canplay", onMeta);
      audio.removeEventListener("error", onErr);
      clearTimeout(timer);
      resolve(ok);
    };
    const onMeta = () => finish(true);
    const onErr = () => finish(false);
    const timer = setTimeout(() => finish(false), META_TIMEOUT_MS);
    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("canplay", onMeta);
    audio.addEventListener("error", onErr);
    audio.src = src;
    audio.load();
  });

  if (!metaOk || !alive()) return opts.shouldStop() ? "stopped" : "error";

  if (opts.startAtSec != null) {
    try {
      audio.currentTime = Math.max(0, opts.startAtSec);
    } catch {
      /* ignore */
    }
  }

  const played = await safePlay(audio);
  if (!played || !alive()) return opts.shouldStop() ? "stopped" : "error";

  return new Promise((resolve) => {
    const cleanup = () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
    const onTime = () => {
      if (!alive()) {
        audio.pause();
        cleanup();
        resolve("stopped");
        return;
      }
      opts.onTime?.(audio.currentTime, audio.duration);
      if (opts.stopAtSec != null && audio.currentTime >= opts.stopAtSec - 0.04) {
        audio.pause();
        cleanup();
        resolve("ok");
      }
    };
    const onEnded = () => {
      cleanup();
      resolve(alive() ? "ok" : "stopped");
    };
    const onError = () => {
      cleanup();
      resolve("error");
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    onTime();
  });
}

/** Play a single URL clip (ayah / wbw word). */
export async function playUrlUntilEnd(
  audio: HTMLAudioElement,
  url: string,
  shouldStop: () => boolean,
  playbackRate = 1,
  session?: number,
  isCurrent?: (session: number) => boolean,
): Promise<PlayClipResult> {
  return playClipToEnd(audio, url, {
    shouldStop,
    playbackRate,
    session,
    isCurrent,
  });
}
