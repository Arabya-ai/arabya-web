/**
 * Import staged content from incoming/ into data/books/{slug}/.
 * Requires explicit confirmation — never bypasses review.
 *
 * Usage:
 *   node scripts/import-from-incoming.mjs --slug=NAME --from=./incoming/path.json --i-confirm-rights
 *
 * Input JSON shape matches import-irab-book.mjs:
 * { "meta": { "title", "license", "source", ... }, "verses": [{ "verseKey", "text" }] }
 */
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function arg(name) {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

async function main() {
  const slug = arg("slug");
  const from = arg("from");
  if (!slug || !from) {
    console.error(
      "Usage: node scripts/import-from-incoming.mjs --slug=NAME --from=path.json --i-confirm-rights",
    );
    process.exit(1);
  }
  if (!hasFlag("i-confirm-rights")) {
    console.error(
      "Refusing import: pass --i-confirm-rights after you verified redistribution is allowed for this project.",
    );
    process.exit(1);
  }

  const resolved = path.resolve(from);
  await access(resolved);

  const importer = path.join(root, "scripts", "import-irab-book.mjs");
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [importer, `--slug=${slug}`, `--from=${resolved}`],
      { stdio: "inherit", cwd: root },
    );
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`import-irab-book exited ${code}`));
    });
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
