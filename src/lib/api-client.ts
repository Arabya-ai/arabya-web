/**
 * Unified client for `/api/...` calls.
 * On the web, base URL is empty (same origin).
 * Native shells (Capacitor later) set `NEXT_PUBLIC_API_BASE`.
 */

export function getApiBaseUrl(): string {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE?.trim()
      : undefined;
  if (!raw) return "";
  return raw.replace(/\/$/, "");
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalized}`;
}

export async function apiGet(
  path: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(apiUrl(path), {
    ...init,
    method: init?.method ?? "GET",
  });
}

export async function apiGetJson<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await apiGet(path, init);
  if (!res.ok) {
    throw new Error(`api_error:${res.status}:${path}`);
  }
  return (await res.json()) as T;
}
