"use client";

import { useEffect, useRef } from "react";

/**
 * Studio editor layout uses --arabya-header-height.
 * Measured only on studio routes (not on mushaf/home) to avoid global forced reflows.
 */
export function StudioHeaderHeightSync() {
  const ran = useRef(false);

  useEffect(() => {
    const header = document.querySelector("header.site-header");
    if (!(header instanceof HTMLElement)) return;

    const sync = () => {
      requestAnimationFrame(() => {
        document.documentElement.style.setProperty(
          "--arabya-header-height",
          `${header.offsetHeight}px`,
        );
      });
    };

    sync();
    if (ran.current) return;
    ran.current = true;

    const ro = new ResizeObserver(sync);
    ro.observe(header);
    return () => ro.disconnect();
  }, []);

  return null;
}
