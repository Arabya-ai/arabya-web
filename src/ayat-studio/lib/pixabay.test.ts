import { describe, expect, it } from "vitest";
import {
  pickBestPixabayVideoFile,
  type PixabayVideo,
} from "@/ayat-studio/lib/pixabay";

describe("pickBestPixabayVideoFile", () => {
  it("prefers mid-quality mp4 under 1080 for portrait", () => {
    const video = {
      id: 1,
      width: 1080,
      height: 1920,
      duration: 8,
      url: "",
      image: "",
      user: { name: "x", url: "" },
      video_files: [
        {
          id: 0,
          quality: "large",
          file_type: "video/mp4",
          width: 2160,
          height: 3840,
          link: "https://cdn.pixabay.com/video/a-4k.mp4",
        },
        {
          id: 1,
          quality: "medium",
          file_type: "video/mp4",
          width: 1080,
          height: 1920,
          link: "https://cdn.pixabay.com/video/a-1080.mp4",
        },
        {
          id: 2,
          quality: "tiny",
          file_type: "video/mp4",
          width: 360,
          height: 640,
          link: "https://cdn.pixabay.com/video/a-tiny.mp4",
        },
      ],
    } as PixabayVideo;

    expect(pickBestPixabayVideoFile(video, "portrait")?.link).toContain(
      "a-1080.mp4",
    );
  });
});
