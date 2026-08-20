import { readFile } from "node:fs/promises";
import path from "node:path";
import type { HijriEvent } from "@/lib/hijri-events-core";

export type {
  HijriEvent,
  HijriMonthName,
} from "@/lib/hijri-events-core";
export {
  HIJRI_MONTHS,
  upcomingHijriEvents,
  formatHijriEventDate,
} from "@/lib/hijri-events-core";

const dataRoot = path.join(process.cwd(), "data", "ibadah");

export async function listHijriEvents(): Promise<HijriEvent[]> {
  try {
    const raw = await readFile(
      path.join(dataRoot, "hijri-events.json"),
      "utf8",
    );
    const parsed = JSON.parse(raw) as { events?: HijriEvent[] };
    return (parsed.events ?? []).filter(
      (e) =>
        e.id &&
        e.month >= 1 &&
        e.month <= 12 &&
        e.day >= 1 &&
        e.day <= 30,
    );
  } catch {
    return [];
  }
}
