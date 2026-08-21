/**
 * Contabo / browser video export muxing via Mediabunny (successor to
 * mp4-muxer + webm-muxer). Serializes WebCodecs encoder callbacks into
 * Mediabunny's async packet pipeline with backpressure.
 */
import {
  BufferTarget,
  EncodedAudioPacketSource,
  EncodedPacket,
  EncodedVideoPacketSource,
  Mp4OutputFormat,
  Output,
  WebMOutputFormat,
} from "mediabunny";

export type MuxContainer = "mp4" | "webm";

export type MediabunnyMuxSession = {
  addVideoChunk: (
    chunk: EncodedVideoChunk,
    meta?: EncodedVideoChunkMetadata,
  ) => void;
  addAudioChunk: (
    chunk: EncodedAudioChunk,
    meta?: EncodedAudioChunkMetadata,
  ) => void;
  /** Wait for queued packet writes, finalize container, return file bytes. */
  finalize: () => Promise<ArrayBuffer>;
};

export async function createMediabunnyMuxSession(opts: {
  container: MuxContainer;
  frameRate: number;
}): Promise<MediabunnyMuxSession> {
  const target = new BufferTarget();
  const output = new Output({
    format:
      opts.container === "webm"
        ? new WebMOutputFormat()
        : new Mp4OutputFormat({ fastStart: "in-memory" }),
    target,
  });

  const videoSource = new EncodedVideoPacketSource(
    opts.container === "webm" ? "vp9" : "avc",
  );
  const audioSource = new EncodedAudioPacketSource(
    opts.container === "webm" ? "opus" : "aac",
  );

  output.addVideoTrack(videoSource, { frameRate: opts.frameRate });
  output.addAudioTrack(audioSource);
  await output.start();

  let writeChain: Promise<void> = Promise.resolve();
  let writeError: Error | null = null;

  const enqueue = (task: () => Promise<void>) => {
    writeChain = writeChain
      .then(task)
      .catch((e: unknown) => {
        writeError =
          e instanceof Error ? e : new Error(String(e || "mux_write_failed"));
      });
  };

  return {
    addVideoChunk(chunk, meta) {
      enqueue(() =>
        videoSource.add(EncodedPacket.fromEncodedChunk(chunk), meta),
      );
    },
    addAudioChunk(chunk, meta) {
      enqueue(() =>
        audioSource.add(EncodedPacket.fromEncodedChunk(chunk), meta),
      );
    },
    async finalize() {
      await writeChain;
      if (writeError) throw writeError;
      await output.finalize();
      if (!target.buffer) {
        throw new Error("mediabunny_empty_buffer");
      }
      return target.buffer;
    },
  };
}

export function mimeForContainer(container: MuxContainer): string {
  return container === "webm" ? "video/webm" : "video/mp4";
}
