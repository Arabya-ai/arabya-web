"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, Loader2, Film, Image as ImageIcon } from "lucide-react";
import { Button } from "@/ayat-studio/components/ui/button";
import { Input } from "@/ayat-studio/components/ui/input";
import {
  searchPexelsPhotos,
  searchPexelsVideos,
  type PexelsPhoto,
  type PexelsVideo,
} from "@/ayat-studio/lib/pexels";
import { studioMediaUrl } from "@/ayat-studio/lib/media-url";

const SUGGESTIONS = [
  "mosque",
  "nature",
  "mountains",
  "sky",
  "stars night",
  "calm sea",
  "charity",
  "quran",
];

type MediaKind = "video" | "photo";

interface BackgroundSearchProps {
  orientation: "landscape" | "portrait" | "square";
  onSelectPhoto?: (url: string) => void;
  onSelectVideo?: (url: string, poster: string) => void;
}

export function BackgroundSearch({
  orientation,
  onSelectPhoto,
  onSelectVideo,
}: BackgroundSearchProps) {
  const t = useTranslations("StudioAi");
  const [kind, setKind] = useState<MediaKind>("video");
  const [query, setQuery] = useState("");
  const [photos, setPhotos] = useState<PexelsPhoto[]>([]);
  const [videos, setVideos] = useState<PexelsVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(q?: string) {
    const term = (q ?? query).trim();
    if (!term) return;
    setLoading(true);
    setError(null);
    try {
      if (kind === "photo") {
        const result = await searchPexelsPhotos(term, {
          perPage: 12,
          orientation,
        });
        setPhotos(result.photos ?? []);
        setVideos([]);
      } else {
        const result = await searchPexelsVideos(term, {
          perPage: 8,
          orientation,
        });
        setVideos(result.videos ?? []);
        setPhotos([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errorSearch"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-[11px] tracking-widest uppercase text-accent/80 sm:text-xs">
        {t("bgSearchTitle")}
      </p>

      {/* Kind toggle */}
      <div className="flex items-center justify-center gap-1 rounded-lg border border-border bg-background/50 p-0.5">
        <button
          type="button"
          onClick={() => setKind("video")}
          className={`flex items-center gap-1 rounded-md px-3 py-1 text-[11px] font-medium transition ${
            kind === "video"
              ? "bg-accent/15 text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Film className="h-3 w-3" />
          {t("bgVideo")}
        </button>
        <button
          type="button"
          onClick={() => setKind("photo")}
          className={`flex items-center gap-1 rounded-md px-3 py-1 text-[11px] font-medium transition ${
            kind === "photo"
              ? "bg-accent/15 text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <ImageIcon className="h-3 w-3" />
          {t("bgPhoto")}
        </button>
      </div>

      {/* Search input */}
      <div className="flex gap-1.5">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSearch();
            }
          }}
          placeholder={t("bgSearchPlaceholder")}
          className="h-8 text-xs"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 px-2"
          disabled={loading || !query.trim()}
          onClick={() => void handleSearch()}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Search className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Quick suggestions */}
      <div className="flex flex-wrap gap-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground transition hover:border-accent/40 hover:text-accent"
            onClick={() => {
              setQuery(s);
              void handleSearch(s);
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-[11px] text-destructive">{error}</p>
      )}

      {/* Results grid */}
      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              className="group relative overflow-hidden rounded-lg border border-border/40 transition hover:border-accent/60"
              onClick={() => {
                const url = studioMediaUrl(photo.src.large);
                onSelectPhoto?.(url);
              }}
            >
              <img
                src={studioMediaUrl(photo.src.medium)}
                alt={photo.alt || ""}
                className="aspect-video w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1 pb-0.5 pt-3">
                <p className="truncate text-[8px] text-white/80">
                  {photo.photographer}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {videos.length > 0 && (
        <div className="grid grid-cols-2 gap-1.5">
          {videos.map((video) => (
            <button
              key={video.id}
              type="button"
              className="group relative overflow-hidden rounded-lg border border-border/40 transition hover:border-accent/60"
              onClick={() => {
                const file = video.video_files?.[0];
                if (file?.link) {
                  onSelectVideo?.(
                    studioMediaUrl(file.link),
                    studioMediaUrl(video.image),
                  );
                }
              }}
            >
              <img
                src={studioMediaUrl(video.image)}
                alt=""
                className="aspect-video w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1 pb-0.5 pt-3">
                <p className="truncate text-[8px] text-white/80">
                  {video.duration}s · {video.user?.name}
                </p>
              </div>
              <div className="absolute right-1 top-1 rounded bg-black/50 px-1 py-0.5 text-[8px] text-white/80">
                <Film className="inline h-2.5 w-2.5" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
