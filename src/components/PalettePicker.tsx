"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import {
  ARABYA_PALETTES,
  DEFAULT_PALETTE,
  PALETTE_SWATCHES,
  applyPalette,
  persistPalette,
  readStoredPalette,
  type ArabyaPalette,
} from "@/lib/palette";

/**
 * Floating Warraq-style «لون الواجهة» swatches.
 * Hidden on mushaf so the sacred reading surface stays calm.
 */
export function PalettePicker() {
  const t = useTranslations("Palette");
  const pathname = usePathname();
  const [palette, setPalette] = useState<ArabyaPalette>(DEFAULT_PALETTE);
  const [ready, setReady] = useState(false);

  const onMushaf =
    pathname === "/mushaf" ||
    pathname.startsWith("/mushaf/") ||
    pathname.includes("/mushaf/");

  useEffect(() => {
    const next = readStoredPalette();
    setPalette(next);
    applyPalette(next);
    setReady(true);
  }, []);

  if (onMushaf || !ready) return null;

  const select = (next: ArabyaPalette) => {
    setPalette(next);
    applyPalette(next);
    persistPalette(next);
  };

  return (
    <div className="arabya-palette-picker" role="group" aria-label={t("label")}>
      <span className="arabya-palette-picker__label">{t("label")}</span>
      <div className="arabya-palette-picker__swatches">
        {ARABYA_PALETTES.map((id) => {
          const active = palette === id;
          return (
            <button
              key={id}
              type="button"
              className={`arabya-palette-picker__swatch${active ? " is-active" : ""}`}
              style={{ background: PALETTE_SWATCHES[id] }}
              aria-label={t(`names.${id}`)}
              aria-pressed={active}
              title={t(`names.${id}`)}
              onClick={() => select(id)}
            />
          );
        })}
      </div>
    </div>
  );
}
