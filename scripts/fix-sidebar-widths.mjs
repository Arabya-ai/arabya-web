import fs from "node:fs";

const p = "src/ayat-studio/components/ui/sidebar.tsx";
let s = fs.readFileSync(p, "utf8");

s = s.replaceAll("w-[--sidebar-width]", "w-[var(--sidebar-width)]");
s = s.replaceAll("w-[--sidebar-width-icon]", "w-[var(--sidebar-width-icon)]");
s = s.replaceAll("max-w-[--skeleton-width]", "max-w-[var(--skeleton-width)]");
s = s.replaceAll("theme(spacing.4)", "1rem");
s = s.replaceAll("group-data-[side=right]:rotate-180", "");
s = s.replace(
  '"relative h-svh w-[var(--sidebar-width)] bg-transparent transition-[width] duration-200 ease-linear"',
  '"relative h-svh w-[var(--sidebar-width)] shrink-0 bg-transparent transition-[width] duration-200 ease-linear"',
);

// Clean accidental double spaces from removed class
s = s.replaceAll("  ", " ").replaceAll('" ,', '",');

fs.writeFileSync(p, s);
console.log(
  "ok",
  !s.includes("w-[--sidebar"),
  !s.includes("rotate-180"),
  s.includes("shrink-0 bg-transparent"),
);
