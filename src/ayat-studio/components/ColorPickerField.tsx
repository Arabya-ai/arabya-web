"use client";

import { Input } from "@/ayat-studio/components/ui/input";
import { Label } from "@/ayat-studio/components/ui/label";

const PRESETS = ["#C8A951", "#ffffff", "#f0e6d0", "#e8c97f", "#34d399", "#60a5fa", "#f472b6", "#fbbf24"];

function normalizeHex(raw: string): string | null {
  const v = raw.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  if (/^#[0-9a-fA-F]{3}$/.test(v)) {
    const s = v.slice(1);
    return `#${s[0]}${s[0]}${s[1]}${s[1]}${s[2]}${s[2]}`.toLowerCase();
  }
  if (/^[0-9a-fA-F]{6}$/.test(v)) return `#${v.toLowerCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(v)) {
    return `#${v[0]}${v[0]}${v[1]}${v[1]}${v[2]}${v[2]}`.toLowerCase();
  }
  return null;
}

export function ColorPickerField({
  label,
  value,
  onChange,
  presets = PRESETS,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
  presets?: string[];
}) {
  const current = normalizeHex(value) || "#C8A951";

  return (
    <div className="space-y-2">
      <Label className="text-xs text-accent">{label}</Label>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`h-8 w-8 rounded-full border-2 transition-all ${
              current === c.toLowerCase()
                ? "border-accent scale-110 shadow-glow"
                : "border-border hover:border-accent/50"
            }`}
            style={{ backgroundColor: c }}
            aria-label={c}
          />
        ))}
        <input
          type="color"
          value={current}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-accent/30 bg-transparent p-0.5"
          aria-label="لوحة الألوان"
        />
        <Input
          dir="ltr"
          className="h-8 w-[7.5rem] bg-background/50 border-accent/20 text-left text-xs"
          value={value}
          placeholder="#C8A951"
          onChange={(e) => {
            const next = e.target.value;
            const ok = normalizeHex(next);
            onChange(ok || next);
          }}
          onBlur={() => {
            const ok = normalizeHex(value);
            if (ok) onChange(ok);
          }}
        />
      </div>
    </div>
  );
}
