"use client";

import { usePathname } from "@/i18n/navigation";
import { useEffect } from "react";

/** Keeps mushaf routes on the legacy Arabya surface — Warraq skin CSS is scoped away. */
export function WarraqSurfaceGate() {
  const pathname = usePathname();

  useEffect(() => {
    const isMushaf =
      pathname === "/mushaf" ||
      pathname.startsWith("/mushaf/") ||
      pathname.endsWith("/mushaf") ||
      pathname.includes("/mushaf/");

    if (isMushaf) {
      document.body.dataset.arabyaSurface = "mushaf";
    } else {
      delete document.body.dataset.arabyaSurface;
    }

    return () => {
      delete document.body.dataset.arabyaSurface;
    };
  }, [pathname]);

  return null;
}
