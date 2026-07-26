"use client";

import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";

function canHoverFine(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

/**
 * Open/close state with outside click (capture), Escape, and optional hover.
 */
export function useDismissibleOpen(
  rootRef: RefObject<HTMLElement | null>,
  opts?: {
    /** Also close when pointer leaves the root (desktop hover menus). */
    closeOnPointerLeave?: boolean;
  },
): {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  toggle: () => void;
  openOnHover: () => void;
  closeOnLeave: () => void;
} {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(e: PointerEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (root.contains(e.target as Node)) return;
      setOpen(false);
      const active = document.activeElement;
      if (active instanceof HTMLElement && root.contains(active)) {
        active.blur();
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        rootRef.current?.contains(active)
      ) {
        active.blur();
      }
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, rootRef]);

  const toggle = useCallback(() => {
    setOpen((v) => !v);
  }, []);

  const openOnHover = useCallback(() => {
    if (canHoverFine()) setOpen(true);
  }, []);

  const closeOnLeave = useCallback(() => {
    if (!opts?.closeOnPointerLeave) return;
    if (canHoverFine()) setOpen(false);
  }, [opts?.closeOnPointerLeave]);

  return { open, setOpen, toggle, openOnHover, closeOnLeave };
}
