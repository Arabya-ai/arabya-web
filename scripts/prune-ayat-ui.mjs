import fs from "node:fs";
import path from "node:path";

const root = "src/ayat-studio";

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?)$/.test(e.name)) out.push(p);
  }
  return out;
}

function resolveImport(spec) {
  const rel = spec.replace("@/ayat-studio/", "src/ayat-studio/");
  const candidates = [
    rel,
    `${rel}.ts`,
    `${rel}.tsx`,
    path.join(rel, "index.ts"),
    path.join(rel, "index.tsx"),
  ];
  return candidates.find((c) => fs.existsSync(c));
}

const files = walk(root);
const queue = files.filter(
  (f) =>
    f.includes(`${path.sep}pages${path.sep}`) ||
    /AppSidebar|DashboardLayout|BackgroundPicker|AudioPreviewPlayer|IslamicDecor|NavLink|StudioProviders|toaster|toast\.tsx|use-toast|sidebar\.tsx/.test(
      f,
    ),
);

const needed = new Set();
const seen = new Set();
while (queue.length) {
  const f = queue.pop();
  if (seen.has(f)) continue;
  seen.add(f);
  needed.add(f);
  const s = fs.readFileSync(f, "utf8");
  const re = /from ["'](@\/ayat-studio\/[^"']+)["']/g;
  let m;
  while ((m = re.exec(s))) {
    const resolved = resolveImport(m[1]);
    if (resolved) queue.push(resolved);
  }
}

const allUi = files.filter((f) => f.includes(`${path.sep}ui${path.sep}`));
const unused = allUi.filter((f) => !needed.has(f));
console.log(
  "needed ui:",
  [...needed]
    .filter((f) => f.includes(`${path.sep}ui${path.sep}`))
    .map((f) => path.basename(f))
    .sort()
    .join(", "),
);
for (const f of unused) fs.unlinkSync(f);
console.log("deleted unused ui:", unused.length);
