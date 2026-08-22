"use client";

import {
  instantProofreadLocal,
  LUGHAWI_INSTANT_DEBOUNCE_MS,
} from "@/lib/lughawi/instant-proofread";
import type { LughawiEdit } from "@/lib/lughawi/types";
import { useEffect, useState } from "react";

export function useInstantProofread(
  text: string,
  opts: {
    enabled: boolean;
    proofMode?: "full" | "spelling";
  },
): { instantEdits: LughawiEdit[]; instantScanning: boolean } {
  const [instantEdits, setInstantEdits] = useState<LughawiEdit[]>([]);
  const [instantScanning, setInstantScanning] = useState(false);

  useEffect(() => {
    if (!opts.enabled) {
      setInstantEdits([]);
      setInstantScanning(false);
      return;
    }
    if (!text.trim()) {
      setInstantEdits([]);
      setInstantScanning(false);
      return;
    }

    setInstantScanning(true);
    const timer = window.setTimeout(() => {
      setInstantEdits(
        instantProofreadLocal(text, { proofMode: opts.proofMode ?? "full" }),
      );
      setInstantScanning(false);
    }, LUGHAWI_INSTANT_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [text, opts.enabled, opts.proofMode]);

  return { instantEdits, instantScanning };
}
