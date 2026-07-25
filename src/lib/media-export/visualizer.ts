// Shared visualizer drawer — used in live preview & video export.
export type VisualizerType = "none" | "bars" | "wave" | "circle" | "particles";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const num = parseInt(v, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

interface DrawArgs {
  canvas: HTMLCanvasElement;
  /** Frequency data 0..255 (length = analyser.frequencyBinCount) */
  data: Uint8Array;
  type: VisualizerType;
  color: string;
  /** 0..1 — overall scale of the visualization */
  intensity: number;
  /** When true, clear the canvas first. Keep true for standalone preview canvas, false for export overlay. */
  clear?: boolean;
}

export function drawVisualizer({ canvas, data, type, color, intensity, clear = true }: DrawArgs) {
  if (type === "none") return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.save();
  if (clear) ctx.clearRect(0, 0, w, h);

  const { r, g, b } = hexToRgb(color);
  const rgba = (a: number) => `rgba(${r},${g},${b},${a})`;

  if (type === "bars") {
    const bars = Math.min(48, data.length);
    const step = Math.max(1, Math.floor(data.length / bars));
    const barW = w / bars;
    for (let i = 0; i < bars; i++) {
      const v = data[i * step] / 255;
      const bh = v * h * 0.25 * (0.4 + intensity);
      const grad = ctx.createLinearGradient(0, h, 0, h - bh);
      grad.addColorStop(0, rgba(0.85));
      grad.addColorStop(1, rgba(0.15));
      ctx.fillStyle = grad;
      const x = i * barW + barW * 0.15;
      ctx.fillRect(x, h - bh, barW * 0.7, bh);
    }
    ctx.restore();
    return;
  }

  if (type === "wave") {
    ctx.strokeStyle = rgba(0.85);
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.shadowColor = rgba(0.6);
    ctx.shadowBlur = 12;
    ctx.beginPath();
    const mid = h * 0.85;
    const amp = h * 0.08 * (0.4 + intensity);
    for (let x = 0; x < w; x++) {
      const i = Math.floor((x / w) * data.length);
      const v = (data[i] - 128) / 128;
      const y = mid + v * amp;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (type === "circle") {
    const cx = w / 2;
    const cy = h / 2;
    const baseR = Math.min(w, h) * 0.28;
    const segments = 96;
    ctx.lineWidth = Math.max(2, w * 0.004);
    ctx.strokeStyle = rgba(0.9);
    ctx.shadowColor = rgba(0.5);
    ctx.shadowBlur = 14;
    ctx.beginPath();
    for (let i = 0; i <= segments; i++) {
      const idx = Math.min(data.length - 1, Math.floor((i / segments) * data.length));
      const v = data[idx] / 255;
      const r2 = baseR + v * baseR * 0.6 * (0.4 + intensity);
      const a = (i / segments) * Math.PI * 2;
      const x = cx + Math.cos(a) * r2;
      const y = cy + Math.sin(a) * r2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
    return;
  }

  if (type === "particles") {
    const count = 60;
    const cx = w / 2;
    const cy = h * 0.6;
    for (let i = 0; i < count; i++) {
      const v = data[(i * 3) % data.length] / 255;
      const a = (i / count) * Math.PI * 2;
      const dist = Math.min(w, h) * (0.15 + v * 0.35 * (0.4 + intensity));
      const x = cx + Math.cos(a) * dist;
      const y = cy + Math.sin(a) * dist * 0.6;
      const size = 1 + v * Math.min(w, h) * 0.012;
      ctx.fillStyle = rgba(0.4 + v * 0.6);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  ctx.restore();
}
