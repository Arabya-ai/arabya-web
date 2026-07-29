import { STORAGE_KEYS } from "@/lib/storage-keys";

export type Theme = "light" | "dark";

const THEME_KEY = STORAGE_KEYS.theme;

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute("content", theme === "dark" ? "#071110" : "#0f766e");
  }
}

export function readStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "dark" || saved === "light") return saved;
    // First visit: always light (do not follow OS dark preference).
    return "light";
  } catch {
    return "light";
  }
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* ignore */
  }
}
