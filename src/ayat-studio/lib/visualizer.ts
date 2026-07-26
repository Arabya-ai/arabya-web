// Shared visualizer drawer — used in live preview & video export.
export type VisualizerType =
  | "none"
  | "bars"
  | "wave"
  | "circle"
  | "particles"
  | "mirror"
  | "aurora"
  | "spectrum"
  | "ripple";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const m = hex.replace("#", "");
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const num = parseInt(v, 16) || 0xc8a951;
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

interface DrawArgs {
  canvas: HTMLCanvasElement;
  data: Uint8Array;
  type: VisualizerType;
  color: string;
  intensity: number;
  clear?: boolean;
}

export function drawVisualizer({
  canvas,
  data,
  type,
  color,
  intensity,
  clear = true,
}: DrawArgs) {
  if (type === "none") return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.save();
  if (clear) ctx.clearRect(0, 0, w, h);

  const { r, g, b } = hexToRgb(color);
  const rgba = (a: number) => `rgba(${r},${g},${b},${a})`;
  const boost = 0.35 + intensity;

  if (type === "bars") {
    const bars = Math.min(48, data.length);
    const step = Math.max(1, Math.floor(data.length / bars));
    const barW = w / bars;
    for (let i = 0; i < bars; i++) {
      const v = data[i * step] / 255;
      const bh = v * h * 0.28 * boost;
      const grad = ctx.createLinearGradient(0, h, 0, h - bh);
      grad.addColorStop(0, rgba(0.9));
      grad.addColorStop(1, rgba(0.12));
      ctx.fillStyle = grad;
      ctx.fillRect(i * barW + barW * 0.15, h - bh, barW * 0.7, bh);
    }
    ctx.restore();
    return;
  }

  if (type === "wave") {
    ctx.strokeStyle = rgba(0.9);
    ctx.lineWidth = Math.max(2, w * 0.003);
    ctx.shadowColor = rgba(0.55);
    ctx.shadowBlur = 14;
    ctx.beginPath();
    const mid = h * 0.84;
    const amp = h * 0.09 * boost;
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
      const r2 = baseR + v * baseR * 0.65 * boost;
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
    const count = 72;
    const cx = w / 2;
    const cy = h * 0.58;
    for (let i = 0; i < count; i++) {
      const v = data[(i * 3) % data.length] / 255;
      const a = (i / count) * Math.PI * 2;
      const dist = Math.min(w, h) * (0.12 + v * 0.38 * boost);
      const x = cx + Math.cos(a) * dist;
      const y = cy + Math.sin(a) * dist * 0.62;
      const size = 1 + v * Math.min(w, h) * 0.014;
      ctx.fillStyle = rgba(0.35 + v * 0.65);
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (type === "mirror") {
    const bars = Math.min(40, data.length);
    const step = Math.max(1, Math.floor(data.length / bars));
    const barW = w / bars;
    const mid = h * 0.72;
    for (let i = 0; i < bars; i++) {
      const v = data[i * step] / 255;
      const bh = v * h * 0.18 * boost;
      ctx.fillStyle = rgba(0.75);
      ctx.fillRect(i * barW + barW * 0.2, mid - bh, barW * 0.6, bh);
      ctx.fillStyle = rgba(0.28);
      ctx.fillRect(i * barW + barW * 0.2, mid, barW * 0.6, bh * 0.85);
    }
    ctx.restore();
    return;
  }

  if (type === "aurora") {
    const bands = 5;
    for (let b = 0; b < bands; b++) {
      const base = data[Math.floor((b / bands) * data.length)] / 255;
      const y = h * (0.55 + b * 0.07);
      const amp = h * 0.04 * boost * (0.5 + base);
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 8) {
        const i = Math.floor((x / w) * data.length);
        const v = data[i] / 255;
        ctx.lineTo(x, y + Math.sin(x * 0.01 + b) * amp * v);
      }
      ctx.strokeStyle = rgba(0.15 + base * 0.45);
      ctx.lineWidth = Math.max(6, w * 0.01);
      ctx.shadowColor = rgba(0.4);
      ctx.shadowBlur = 20;
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (type === "spectrum") {
    const cx = w / 2;
    const cy = h * 0.62;
    const rings = 3;
    for (let ring = 0; ring < rings; ring++) {
      const baseR = Math.min(w, h) * (0.12 + ring * 0.08);
      ctx.beginPath();
      const segs = 64;
      for (let i = 0; i <= segs; i++) {
        const idx = Math.floor((i / segs) * data.length);
        const v = data[idx] / 255;
        const rr = baseR + v * baseR * 0.55 * boost;
        const a = (i / segs) * Math.PI * 2 - Math.PI / 2;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = rgba(0.35 + ring * 0.2);
      ctx.lineWidth = Math.max(1.5, w * 0.0025);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (type === "ripple") {
    const cx = w / 2;
    const cy = h * 0.55;
    const energy =
      data.reduce((s, v) => s + v, 0) / Math.max(1, data.length) / 255;
    for (let i = 0; i < 6; i++) {
      const rr = Math.min(w, h) * (0.08 + i * 0.07) * (0.7 + energy * boost);
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = rgba(0.45 - i * 0.06);
      ctx.lineWidth = Math.max(1, w * 0.002);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  ctx.restore();
}
