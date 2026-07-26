import fs from "node:fs";
import path from "node:path";

function cpDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, e.name);
    const to = path.join(dest, e.name);
    if (e.isDirectory()) cpDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

const ayat = "src/app/[locale]/studio/(ayat)";
const shell = path.join(ayat, "(shell)");
fs.mkdirSync(shell, { recursive: true });

fs.copyFileSync(
  "src/app/[locale]/create/layout.tsx",
  path.join(ayat, "layout.tsx"),
);

fs.writeFileSync(
  path.join(shell, "layout.tsx"),
  `import DashboardLayout from "@/ayat-studio/components/DashboardLayout";

export default function AyatStudioShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardLayout>{children}</DashboardLayout>;
}
`,
);

for (const name of ["dashboard", "editor", "exports", "projects", "settings"]) {
  const from = path.join(ayat, name);
  const to = path.join(shell, name);
  if (!fs.existsSync(from)) continue;
  if (fs.existsSync(to)) fs.rmSync(to, { recursive: true, force: true });
  cpDir(from, to);
  fs.rmSync(from, { recursive: true, force: true });
}

fs.writeFileSync(
  path.join(ayat, "page.tsx"),
  `import type { Metadata } from "next";
import Landing from "@/ayat-studio/pages/Landing";
import { resolveLocale } from "@/i18n/locale-params";

type Props = { params: Promise<{ locale: string }> };

export const metadata: Metadata = {
  title: "آيات ستوديو — الاستوديو",
  description:
    "استوديو إنشاء فيديوهات الآيات: خلفيات، قرّاء، تصدير MP4 — داخل عربية",
};

export default async function StudioLandingPage({ params }: Props) {
  await resolveLocale(params);
  return <Landing />;
}
`,
);

const oldStudio = "src/app/[locale]/studio/page.tsx";
if (fs.existsSync(oldStudio)) fs.unlinkSync(oldStudio);

console.log("ayat:", fs.readdirSync(ayat));
console.log("shell:", fs.readdirSync(shell));
