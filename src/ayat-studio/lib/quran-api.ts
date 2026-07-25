// Fetch Quran ayah text + audio. Text from Arabya QPC API;
// audio via same-origin proxy (avoids EveryAyah CORS / Failed to fetch).
export interface AyahData {
  number: number;
  numberInSurah: number;
  text: string;
  audioUrl: string;
}

function buildProxiedAudioUrl(
  reciterFolder: string,
  surahId: number,
  ayahInSurah: number,
): string {
  const q = new URLSearchParams({
    folder: reciterFolder,
    s: String(surahId),
    v: String(ayahInSurah),
  });
  return `/api/create/audio?${q.toString()}`;
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
          : err.error === "range_too_long"
            ? "نطاق الآيات طويل جدًا (الحد 40 آية لكل تصدير)"
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
      audioUrl: buildProxiedAudioUrl(reciterFolder, surahId, a.numberInSurah),
    }));
}

function networkErrorMessage(err: unknown, ayah?: number): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/failed to fetch|networkerror|load failed/i.test(raw)) {
    return ayah
      ? `تعذّر تنزيل صوت الآية ${ayah}. حدّث الصفحة وتأكد من تسجيل الدخول.`
      : "تعذّر الاتصال بالخادم. حدّث الصفحة وتأكد من تسجيل الدخول.";
  }
  return raw;
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
      let res: Response;
      try {
        res = await fetch(a.audioUrl, { credentials: "same-origin" });
      } catch (e) {
        throw new Error(networkErrorMessage(e, a.numberInSurah));
      }
      if (!res.ok) {
        throw new Error(
          `فشل تنزيل صوت آية ${a.numberInSurah} (HTTP ${res.status})`,
        );
      }
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
