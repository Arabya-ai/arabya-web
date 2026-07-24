/**
 * يكتب data/studio/quality-queue.json من فحص حقيقي (للاستخدام المحلي/CI).
 * على الموقع الحي يُشغَّل الفحص عبر /api/studio/quality-scan.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

async function main() {
  // Prefer calling validate-data and parsing stdout is fragile;
  // instead spawn a tiny inline via next is not available — use validate exit + empty queue if clean.
  const result = spawnSync("node", ["scripts/validate-data.mjs"], {
    cwd: root,
    encoding: "utf8",
  });
  const out = `${result.stdout || ""}\n${result.stderr || ""}`;
  const items = [];
  let n = 0;
  for (const line of out.split("\n")) {
    const err = line.match(/^ERROR:\s*(.+)$/i) || line.match(/^error:\s*(.+)$/i);
    const warn = line.match(/^WARN(?:ING)?:\s*(.+)$/i);
    const msg = err?.[1] || warn?.[1];
    if (!msg) continue;
    n += 1;
    items.push({
      id: `vq_${n}`,
      title: msg.slice(0, 120),
      priority: err ? "high" : "medium",
      surahHint: "validate-data",
      note: msg,
    });
  }

  // Also capture bare lines that validate-data prints
  if (items.length === 0 && result.status !== 0) {
    items.push({
      id: "vq_fail",
      title: "فشل validate-data",
      priority: "high",
      surahHint: "CI",
      note: out.trim().slice(0, 500) || `exit ${result.status}`,
    });
  }

  const target = path.join(root, "data", "studio", "quality-queue.json");
  await writeFile(target, `${JSON.stringify(items, null, 2)}\n`, "utf8");
  console.log(`Wrote ${items.length} issue(s) → data/studio/quality-queue.json`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
