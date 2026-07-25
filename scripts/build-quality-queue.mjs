/**
 * يكتب data/studio/quality-queue.json من نفس منطق scanQualityIssues.
 */
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = path.join(root, "scripts", "write-quality-queue.mts");

async function main() {
  const result = spawnSync(
    process.execPath,
    ["--experimental-strip-types", runner],
    {
      cwd: root,
      encoding: "utf8",
      env: process.env,
    },
  );

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  if (result.status !== 0) {
    // Fallback: still write a failure marker if the TS runner cannot start
    if (result.error || result.status == null) {
      const target = path.join(root, "data", "studio", "quality-queue.json");
      await writeFile(
        target,
        `${JSON.stringify(
          [
            {
              id: "vq_runner_fail",
              title: "فشل تشغيل ماسح الجودة",
              priority: "high",
              surahHint: "CI",
              note:
                result.stderr?.trim() ||
                result.error?.message ||
                `exit ${result.status}`,
            },
          ],
          null,
          2,
        )}\n`,
        "utf8",
      );
    }
    process.exit(result.status ?? 1);
  }
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
