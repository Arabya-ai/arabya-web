import fs from "node:fs";
import path from "node:path";

const root = path.resolve("src/ayat-studio");

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|css)$/.test(e.name)) out.push(p);
  }
  return out;
}

function write(file, content) {
  fs.writeFileSync(file, content, "utf8");
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

// 1) Rewrite imports
let importChanged = 0;
for (const f of walk(root)) {
  let s = read(f);
  const orig = s;
  s = s
    .replaceAll("@/components/", "@/ayat-studio/components/")
    .replaceAll("@/lib/", "@/ayat-studio/lib/")
    .replaceAll("@/hooks/", "@/ayat-studio/hooks/")
    .replaceAll("@/pages/", "@/ayat-studio/pages/");
  if (s !== orig) {
    write(f, s);
    importChanged++;
  }
}
console.log("import rewrite:", importChanged);

// 2) studio-paths
write(
  path.join(root, "lib/studio-paths.ts"),
  `export const STUDIO_BASE = "/create" as const;

export function studioPath(path: string): string {
  if (!path || path === "/") return STUDIO_BASE;
  const p = path.startsWith("/") ? path : \`/\${path}\`;
  if (p.startsWith("/create")) return p;
  return \`\${STUDIO_BASE}\${p}\`;
}
`,
);

// 3) NavLink
write(
  path.join(root, "components/NavLink.tsx"),
  `"use client";

import { forwardRef } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/ayat-studio/lib/utils";
import { studioPath } from "@/ayat-studio/lib/studio-paths";

interface NavLinkCompatProps
  extends Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href"> {
  className?: string;
  activeClassName?: string;
  pendingClassName?: string;
  to: string;
  end?: boolean;
}

const NavLink = forwardRef<HTMLAnchorElement, NavLinkCompatProps>(
  ({ className, activeClassName, to, end, ...props }, ref) => {
    const pathname = usePathname();
    const href = studioPath(to);
    const isActive = end
      ? pathname === href
      : pathname === href || pathname.startsWith(\`\${href}/\`);
    return (
      <Link
        ref={ref}
        href={href}
        className={cn(className, isActive && activeClassName)}
        {...props}
      />
    );
  },
);

NavLink.displayName = "NavLink";

export { NavLink };
`,
);

// 4) DashboardLayout
write(
  path.join(root, "components/DashboardLayout.tsx"),
  `"use client";

import { SidebarProvider, SidebarTrigger } from "@/ayat-studio/components/ui/sidebar";
import { AppSidebar } from "@/ayat-studio/components/AppSidebar";
import { Link } from "@/i18n/navigation";
import { IslamicBackdrop } from "@/ayat-studio/components/IslamicDecor";
import { Home } from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full relative">
        <IslamicBackdrop />
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 relative">
          <header className="sticky top-0 z-30 h-14 flex items-center justify-between border-b border-accent/10 bg-background/70 backdrop-blur-xl px-4">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="text-accent hover:bg-accent/10" />
              <span className="hidden sm:block text-xs tracking-widest text-accent/60">
                الاستوديو
              </span>
            </div>
            <Link
              href="/"
              className="flex items-center gap-2 text-xs text-muted-foreground hover:text-accent transition-colors"
            >
              <Home className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">عربية</span>
            </Link>
          </header>
          <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-auto relative">
            <div className="relative animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
`,
);

// 5) quran-api
write(
  path.join(root, "lib/quran-api.ts"),
  `// Fetch Quran ayah text + audio. Text from Arabya QPC API; audio from everyayah.com.
export interface AyahData {
  number: number;
  numberInSurah: number;
  text: string;
  audioUrl: string;
}

function pad(n: number, width: number) {
  return n.toString().padStart(width, "0");
}

function buildAudioUrl(
  reciterFolder: string,
  surahId: number,
  ayahInSurah: number,
): string {
  return \`https://everyayah.com/data/\${reciterFolder}/\${pad(surahId, 3)}\${pad(ayahInSurah, 3)}.mp3\`;
}

async function fetchSurahText(
  surahId: number,
  ayahStart: number,
  ayahEnd: number,
) {
  const res = await fetch(
    \`/api/create/ayahs?s=\${surahId}&from=\${ayahStart}&to=\${ayahEnd}\`,
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.error === "plus_required"
        ? "يتطلب اشتراك بلس"
        : err.error === "auth_required"
          ? "يلزم تسجيل الدخول"
          : "فشل جلب نص الآيات",
    );
  }
  const json = await res.json();
  const ayahs = json.ayahs as Record<number, string>;
  return Object.entries(ayahs)
    .map(([n, text]) => ({
      numberInSurah: Number(n),
      text: text as string,
    }))
    .sort((a, b) => a.numberInSurah - b.numberInSurah);
}

export async function fetchAyahs(
  surahId: number,
  ayahStart: number,
  ayahEnd: number,
  reciterFolder: string,
): Promise<AyahData[]> {
  const text = await fetchSurahText(surahId, ayahStart, ayahEnd);
  return text
    .filter((a) => a.numberInSurah >= ayahStart && a.numberInSurah <= ayahEnd)
    .map((a) => ({
      number: a.numberInSurah,
      numberInSurah: a.numberInSurah,
      text: a.text,
      audioUrl: buildAudioUrl(reciterFolder, surahId, a.numberInSurah),
    }));
}

export async function fetchAndDecodeAudio(
  ayahs: AyahData[],
  audioCtx: AudioContext,
): Promise<{
  buffer: AudioBuffer;
  segments: {
    start: number;
    end: number;
    text: string;
    numberInSurah: number;
  }[];
}> {
  const buffers = await Promise.all(
    ayahs.map(async (a) => {
      const res = await fetch(a.audioUrl, { mode: "cors" });
      if (!res.ok)
        throw new Error(
          \`فشل تنزيل صوت آية \${a.numberInSurah} (HTTP \${res.status})\`,
        );
      const arr = await res.arrayBuffer();
      try {
        return await new Promise<AudioBuffer>((resolve, reject) => {
          audioCtx.decodeAudioData(arr.slice(0), resolve, reject);
        });
      } catch {
        throw new Error(\`فشل فك ترميز صوت آية \${a.numberInSurah}\`);
      }
    }),
  );

  const sampleRate = buffers[0].sampleRate;
  const channels = Math.max(...buffers.map((b) => b.numberOfChannels));
  const totalLength = buffers.reduce((s, b) => s + b.length, 0);
  const out = audioCtx.createBuffer(channels, totalLength, sampleRate);

  const segments: {
    start: number;
    end: number;
    text: string;
    numberInSurah: number;
  }[] = [];
  let offset = 0;
  buffers.forEach((b, i) => {
    for (let ch = 0; ch < channels; ch++) {
      const src = b.getChannelData(Math.min(ch, b.numberOfChannels - 1));
      out.getChannelData(ch).set(src, offset);
    }
    const startSec = offset / sampleRate;
    offset += b.length;
    const endSec = offset / sampleRate;
    segments.push({
      start: startSec,
      end: endSec,
      text: ayahs[i].text,
      numberInSurah: ayahs[i].numberInSurah,
    });
  });

  return { buffer: out, segments };
}
`,
);

function ensureUseClient(file) {
  let s = read(file);
  if (!s.startsWith('"use client"') && !s.startsWith("'use client'")) {
    write(file, `"use client";\n${s}`);
  }
}

function patchFile(file, transform) {
  const s = read(file);
  const next = transform(s);
  if (next !== s) write(file, next);
}

// AppSidebar
patchFile(path.join(root, "components/AppSidebar.tsx"), (s) => {
  s = s.replace(
    `import { useLocation, Link } from "react-router-dom";`,
    `import { Link, usePathname } from "@/i18n/navigation";\nimport { studioPath } from "@/ayat-studio/lib/studio-paths";`,
  );
  s = s.replace(
    `const location = useLocation();`,
    `const pathname = usePathname();`,
  );
  s = s.replace(
    `const isActive = location.pathname === item.url;`,
    `const isActive = pathname === studioPath(item.url);`,
  );
  s = s.replace(
    `<Link\n          to="/"\n`,
    `<Link\n          href={studioPath("/")}\n`,
  );
  return s;
});
ensureUseClient(path.join(root, "components/AppSidebar.tsx"));

// BackgroundPicker
patchFile(path.join(root, "components/BackgroundPicker.tsx"), (s) => {
  s = s.replace(
    `import { Link } from "react-router-dom";`,
    `import { Link } from "@/i18n/navigation";\nimport { studioPath } from "@/ayat-studio/lib/studio-paths";`,
  );
  s = s.replace(
    `to="/settings"`,
    `href={studioPath("/settings")}`,
  );
  return s;
});
ensureUseClient(path.join(root, "components/BackgroundPicker.tsx"));
ensureUseClient(path.join(root, "components/AudioPreviewPlayer.tsx"));
ensureUseClient(path.join(root, "components/IslamicDecor.tsx"));

// Pages router patches
const pagePatches = {
  "pages/Landing.tsx": (s) => {
    s = s.replace(
      `import { Link } from "react-router-dom";`,
      `import { Link } from "@/i18n/navigation";\nimport { studioPath } from "@/ayat-studio/lib/studio-paths";`,
    );
    s = s.replace(/to="\/"/g, `href={studioPath("/")}`);
    s = s.replace(/to="\/dashboard"/g, `href={studioPath("/dashboard")}`);
    s = s.replace(/to="\/projects\/new"/g, `href={studioPath("/projects/new")}`);
    return s;
  },
  "pages/Dashboard.tsx": (s) => {
    s = s.replace(
      `import { Link } from "react-router-dom";`,
      `import { Link } from "@/i18n/navigation";\nimport { studioPath } from "@/ayat-studio/lib/studio-paths";`,
    );
    s = s.replace(/to="\/projects\/new"/g, `href={studioPath("/projects/new")}`);
    s = s.replace(/to="\/projects"/g, `href={studioPath("/projects")}`);
    s = s.replace(
      /to=\{`\/editor\/\$\{p\.id\}`\}/g,
      `href={studioPath(\`/editor/\${p.id}\`)}`,
    );
    return s;
  },
  "pages/Projects.tsx": (s) => {
    s = s.replace(
      `import { Link, useNavigate } from "react-router-dom";`,
      `import { Link, useRouter } from "@/i18n/navigation";\nimport { studioPath } from "@/ayat-studio/lib/studio-paths";`,
    );
    s = s.replace(`const navigate = useNavigate();`, `const router = useRouter();`);
    s = s.replace(/navigate\(/g, "router.push(");
    s = s.replace(
      /router\.push\(`\/editor\/\$\{/g,
      "router.push(studioPath(`/editor/${",
    );
    // fix closing if needed - studioPath(`/editor/${id}`)
    s = s.replace(/to="\/projects\/new"/g, `href={studioPath("/projects/new")}`);
    s = s.replace(
      /to=\{`\/editor\/\$\{p\.id\}`\}/g,
      `href={studioPath(\`/editor/\${p.id}\`)}`,
    );
    return s;
  },
  "pages/NewProject.tsx": (s) => {
    s = s.replace(
      `import { useNavigate } from "react-router-dom";`,
      `import { useRouter } from "@/i18n/navigation";\nimport { studioPath } from "@/ayat-studio/lib/studio-paths";`,
    );
    s = s.replace(`const navigate = useNavigate();`, `const router = useRouter();`);
    s = s.replace(
      /navigate\(`\/editor\/\$\{([^}]+)\}`\)/g,
      "router.push(studioPath(`/editor/${$1}`))",
    );
    s = s.replace(/navigate\(/g, "router.push(");
    return s;
  },
  "pages/Editor.tsx": (s) => {
    s = s.replace(
      `import { useNavigate, useParams } from "react-router-dom";`,
      `import { useParams } from "next/navigation";\nimport { useRouter } from "@/i18n/navigation";\nimport { studioPath } from "@/ayat-studio/lib/studio-paths";`,
    );
    s = s.replace(
      `const { id } = useParams();\n  const navigate = useNavigate();`,
      `const params = useParams();\n  const id = params?.id as string;\n  const router = useRouter();`,
    );
    s = s.replace(/navigate\("\/projects"\)/g, `router.push(studioPath("/projects"))`);
    s = s.replace(/navigate\(/g, "router.push(");
    return s;
  },
  "pages/Exports.tsx": (s) => s,
  "pages/AccountSettings.tsx": (s) => s,
  "pages/NotFound.tsx": (s) => {
    s = s.replace(
      `import { useLocation } from "react-router-dom";`,
      `import { usePathname } from "@/i18n/navigation";`,
    );
    s = s.replace(`const location = useLocation();`, `const pathname = usePathname();`);
    s = s.replace(/location\.pathname/g, "pathname");
    return s;
  },
};

for (const [rel, fn] of Object.entries(pagePatches)) {
  const f = path.join(root, rel);
  if (!fs.existsSync(f)) continue;
  patchFile(f, fn);
  ensureUseClient(f);
}

// Ensure use client on UI that uses hooks
for (const rel of [
  "components/ui/sidebar.tsx",
  "components/ui/carousel.tsx",
  "components/ui/form.tsx",
  "components/ui/sonner.tsx",
  "components/ui/toaster.tsx",
  "components/ui/toast.tsx",
  "components/ui/toggle-group.tsx",
  "components/ui/chart.tsx",
  "components/ui/input-otp.tsx",
]) {
  const f = path.join(root, rel);
  if (fs.existsSync(f)) ensureUseClient(f);
}

// Verify no react-router left
const leftovers = [];
for (const f of walk(root)) {
  const s = read(f);
  if (s.includes("react-router")) leftovers.push(path.relative(root, f));
}
console.log("react-router leftovers:", leftovers);

const landing = read(path.join(root, "pages/Landing.tsx"));
console.log("arabic ok:", /تنسيق احترافي/.test(landing));
console.log("landing has studioPath:", landing.includes("studioPath"));
console.log("landing use client:", landing.startsWith('"use client"'));
