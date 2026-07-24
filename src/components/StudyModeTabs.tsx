"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { nextTabIndex } from "@/lib/tablist";

export type StudyModeOption = { id: string; label: string };

type Props = {
  modes: StudyModeOption[];
  mode: string;
  onModeChange: (mode: string) => void;
  panelId?: string;
};

/**
 * Accessible RTL study-mode tablist (WAI-ARIA tabs + roving tabindex).
 * ArrowLeft moves to the next tab; ArrowRight to the previous; Home/End jump.
 * On narrow screens, scroll buttons appear when the rail overflows.
 */
export function StudyModeTabs({
  modes,
  mode,
  onModeChange,
  panelId = "study-panel",
}: Props) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) {
      setCanScrollPrev(false);
      setCanScrollNext(false);
      return;
    }
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 2) {
      setCanScrollPrev(false);
      setCanScrollNext(false);
      return;
    }
    const sl = el.scrollLeft;
    const rtl = getComputedStyle(el).direction === "rtl";
    // Chrome/Safari RTL: 0 → -max; Firefox RTL: max → 0; LTR: 0 → max
    const fromStart = rtl ? (sl <= 0 ? -sl : maxScroll - sl) : sl;
    setCanScrollPrev(fromStart > 2);
    setCanScrollNext(fromStart < maxScroll - 2);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    const onScroll = () => updateScrollState();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro = new ResizeObserver(() => updateScrollState());
    ro.observe(el);
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      window.removeEventListener("resize", updateScrollState);
    };
  }, [modes, updateScrollState]);

  useEffect(() => {
    const idx = modes.findIndex((m) => m.id === mode);
    const tab = idx >= 0 ? tabRefs.current[idx] : null;
    tab?.scrollIntoView({
      behavior: "smooth",
      inline: "nearest",
      block: "nearest",
    });
    updateScrollState();
  }, [mode, modes, updateScrollState]);

  const scrollRail = (direction: "prev" | "next") => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(140, Math.round(el.clientWidth * 0.55));
    const rtl = getComputedStyle(el).direction === "rtl";
    const sign = rtl ? -1 : 1;
    const delta = (direction === "next" ? 1 : -1) * sign * amount;
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  const onTabKeyDown = (
    e: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const next = nextTabIndex(e.key, index, modes.length);
    if (next === null) return;
    e.preventDefault();
    onModeChange(modes[next].id);
    tabRefs.current[next]?.focus();
  };

  const showNav = canScrollPrev || canScrollNext;

  return (
    <div
      className={`mode-rail-wrap${showNav ? " has-overflow" : ""}`}
    >
      <button
        type="button"
        className="mode-rail-nav mode-rail-nav--prev"
        aria-label="تمرير التبويبات يمينًا"
        disabled={!canScrollPrev}
        onClick={() => scrollRail("prev")}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path
            fill="currentColor"
            d="M9.3 5.3a1 1 0 0 1 1.4 0l6 6a1 1 0 0 1 0 1.4l-6 6a1 1 0 1 1-1.4-1.4L14.58 12 9.3 6.7a1 1 0 0 1 0-1.4z"
          />
        </svg>
      </button>

      <div
        className="mode-rail"
        role="tablist"
        aria-label="طريقة الدراسة"
        ref={scrollerRef}
      >
        {modes.map((m, i) => {
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`study-tab-${m.id}`}
              aria-selected={active}
              aria-controls={panelId}
              tabIndex={active ? 0 : -1}
              className={`mode-chip ${active ? "is-active" : ""}`}
              onClick={() => onModeChange(m.id)}
              onKeyDown={(e) => onTabKeyDown(e, i)}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="mode-rail-nav mode-rail-nav--next"
        aria-label="تمرير التبويبات يسارًا"
        disabled={!canScrollNext}
        onClick={() => scrollRail("next")}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path
            fill="currentColor"
            d="M14.7 5.3a1 1 0 0 1 0 1.4L9.42 12l5.28 5.3a1 1 0 1 1-1.4 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.4 0z"
          />
        </svg>
      </button>
    </div>
  );
}
