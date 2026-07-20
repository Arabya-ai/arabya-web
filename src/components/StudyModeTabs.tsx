"use client";

import { useRef, type KeyboardEvent } from "react";
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
 */
export function StudyModeTabs({
  modes,
  mode,
  onModeChange,
  panelId = "study-panel",
}: Props) {
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

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

  return (
    <div className="mode-rail" role="tablist" aria-label="طريقة الدراسة">
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
  );
}
