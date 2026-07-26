"use client";

import { useEffect, useState } from "react";
import {
  isAllowedStudioMediaUrl,
  studioMediaUrl,
} from "@/ayat-studio/lib/media-url";

export type StudioPreviewSrcState = {
  /** Ready URL for <img>/<video> (blob, data, or https fallback). */
  src: string;
  /** Poster for video. */
  poster: string;
  loading: boolean;
  error: string | null;
};

async function materializeMediaUrl(
  raw: string,
  kind: "image" | "video",
  track: (objectUrl: string) => void,
): Promise<string> {
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;

  const requestUrl =
    raw.startsWith("/") || !isAllowedStudioMediaUrl(raw)
      ? raw
      : studioMediaUrl(raw);

  // Same-origin proxy (or already-local path): fetch → blob for reliable <video>/<img>.
  if (requestUrl.startsWith("/")) {
    const res = await fetch(requestUrl, { credentials: "same-origin" });
    if (!res.ok) {
      if (kind === "image" && isAllowedStudioMediaUrl(raw)) {
        return raw;
      }
      if (kind === "video" && isAllowedStudioMediaUrl(raw)) {
        // CSP allows https: media after config fix; use direct CDN as last resort.
        return raw;
      }
      throw new Error(
        res.status === 401
          ? "يلزم تسجيل الدخول لعرض الخلفية"
          : `تعذّر تحميل الخلفية (${res.status})`,
      );
    }
    const blob = await res.blob();
    if (!blob || blob.size === 0) {
      throw new Error("ملف الخلفية فارغ");
    }
    const obj = URL.createObjectURL(blob);
    track(obj);
    return obj;
  }

  return requestUrl;
}

/**
 * Resolve Pexels (and upload) URLs into playable preview sources.
 * Uses `/api/studio/media` + blob: so preview is not blocked by CSP/CORS.
 */
export function useStudioPreviewSrc(
  remoteUrl: string | undefined,
  remotePoster: string | undefined,
  kind: "image" | "video",
): StudioPreviewSrcState {
  const [src, setSrc] = useState("");
  const [poster, setPoster] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const objectUrls: string[] = [];
    const track = (u: string) => objectUrls.push(u);

    const revokeAll = () => {
      for (const u of objectUrls) {
        try {
          URL.revokeObjectURL(u);
        } catch {
          /* ignore */
        }
      }
    };

    void (async () => {
      if (!remoteUrl) {
        setSrc("");
        setPoster("");
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      setSrc("");
      setPoster("");

      try {
        const main = await materializeMediaUrl(remoteUrl, kind, track);
        if (cancelled) return;
        setSrc(main);

        if (kind === "video" && remotePoster) {
          try {
            const p = await materializeMediaUrl(remotePoster, "image", track);
            if (!cancelled) setPoster(p);
          } catch {
            /* poster optional */
          }
        }
      } catch (e) {
        if (!cancelled) {
          setSrc("");
          setPoster("");
          setError(e instanceof Error ? e.message : "تعذّر تحميل الخلفية");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      revokeAll();
    };
  }, [remoteUrl, remotePoster, kind]);

  return { src, poster, loading, error };
}
