import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { scanQualityIssues } from "../src/lib/quality-scan.ts";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const { items, coverage } = await scanQualityIssues(path.join(root, "data"));
const dir = path.join(root, "data", "studio");
await mkdir(dir, { recursive: true });

const target = path.join(dir, "quality-queue.json");
await writeFile(
  target,
  `${JSON.stringify({ generatedAt: new Date().toISOString(), coverage, items }, null, 2)}\n`,
  "utf8",
);

console.log(
  `Wrote ${items.length} issue(s) · meaningAr ${coverage.meaningArPct}% → data/studio/quality-queue.json`,
);
