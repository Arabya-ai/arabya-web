import "@/ayat-studio/theme.css";
import type { CSSProperties, ReactNode } from "react";
import { Toaster } from "@/ayat-studio/components/ui/toaster";
import { TooltipProvider } from "@/ayat-studio/components/ui/tooltip";
import { StudioProviders } from "@/ayat-studio/components/StudioProviders";
import { StudioHeaderHeightSync } from "@/components/StudioHeaderHeightSync";

/**
 * Studio route CSS only — theme is not imported on mushaf/home.
 * Fonts reuse the seven families already loaded in [locale]/layout
 * (Tajawal, Reem Kufi, Amiri → --font-amiri-quran alias).
 */
export default function CreateRootLayout({
  children,
}: {
  children: ReactNode;
}) {
  const studioFontAlias = {
    ["--font-amiri-quran"]: "var(--font-amiri)",
  } as CSSProperties;

  return (
    <div
      id="ayat-studio-root"
      className="ayat-studio"
      style={studioFontAlias}
    >
      <StudioHeaderHeightSync />
      <StudioProviders>
        <TooltipProvider>
          {children}
          <Toaster />
        </TooltipProvider>
      </StudioProviders>
    </div>
  );
}
