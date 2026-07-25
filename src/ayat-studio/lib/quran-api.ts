// Fetch Quran ayah text + audio. Text from Arabya QPC API; audio from everyayah.com.
export interface AyahData {
  number: number;
  numberInSurah: number;
  text: string;
  audioUrl: string;
}

function pad(n: number, width: number) {
  return n.toString().padStart(width, "0");
}

function buildAudioUrl(
  reciterFolder: string,
  surahId: number,
  ayahInSurah: number,
): string {
  return `https://everyayah.com/data/${reciterFolder}/${pad(surahId, 3)}${pad(ayahInSurah, 3)}.mp3`;
}

async function fetchSurahText(
  surahId: number,
  ayahStart: number,
  ayahEnd: number,
) {
  const res = await fetch(
    `/api/create/ayahs?s=${surahId}&from=${ayahStart}&to=${ayahEnd}`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error === "plus_required"
        ? "يتطلب اشتراك بلس"
        : err.error === "auth_required"
          ? "يلزم تسجيل الدخول"
          : "فشل جلب نص الآيات",
    );
  }
  const json = await res.json();
  const ayahs = json.ayahs as Record<number, string>;
  return Object.entries(ayahs)
    .map(([n, text]) => ({
      numberInSurah: Number(n),
      text: text as string,
    }))
    .sort((a, b) => a.numberInSurah - b.numberInSurah);
}

export async function fetchAyahs(
  surahId: number,
  ayahStart: number,
  ayahEnd: number,
  reciterFolder: string,
): Promise<AyahData[]> {
  const text = await fetchSurahText(surahId, ayahStart, ayahEnd);
  return text
    .filter((a) => a.numberInSurah >= ayahStart && a.numberInSurah <= ayahEnd)
    .map((a) => ({
      number: a.numberInSurah,
      numberInSurah: a.numberInSurah,
      text: a.text,
      audioUrl: buildAudioUrl(reciterFolder, surahId, a.numberInSurah),
    }));
}

export async function fetchAndDecodeAudio(
  ayahs: AyahData[],
  audioCtx: AudioContext,
): Promise<{
  buffer: AudioBuffer;
  segments: {
    start: number;
    end: number;
    text: string;
    numberInSurah: number;
  }[];
}> {
  const buffers = await Promise.all(
    ayahs.map(async (a) => {
      const res = await fetch(a.audioUrl, { mode: "cors" });
      if (!res.ok)
        throw new Error(
          `فشل تنزيل صوت آية ${a.numberInSurah} (HTTP ${res.status})`,
        );
      const arr = await res.arrayBuffer();
      try {
        return await new Promise<AudioBuffer>((resolve, reject) => {
          audioCtx.decodeAudioData(arr.slice(0), resolve, reject);
        });
      } catch {
        throw new Error(`فشل فك ترميز صوت آية ${a.numberInSurah}`);
      }
    }),
  );

  const sampleRate = buffers[0].sampleRate;
  const channels = Math.max(...buffers.map((b) => b.numberOfChannels));
  const totalLength = buffers.reduce((s, b) => s + b.length, 0);
  const out = audioCtx.createBuffer(channels, totalLength, sampleRate);

  const segments: {
    start: number;
    end: number;
    text: string;
    numberInSurah: number;
  }[] = [];
  let offset = 0;
  buffers.forEach((b, i) => {
    for (let ch = 0; ch < channels; ch++) {
      const src = b.getChannelData(Math.min(ch, b.numberOfChannels - 1));
      out.getChannelData(ch).set(src, offset);
    }
    const startSec = offset / sampleRate;
    offset += b.length;
    const endSec = offset / sampleRate;
    segments.push({
      start: startSec,
      end: endSec,
      text: ayahs[i].text,
      numberInSurah: ayahs[i].numberInSurah,
    });
  });

  return { buffer: out, segments };
}
