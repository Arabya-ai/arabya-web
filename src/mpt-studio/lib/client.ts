export type MptHealth = {
  ok: boolean;
  configured: boolean;
  online: boolean;
  docs: string | null;
};

export type MptTask = {
  task_id?: string;
  state?: number;
  progress?: number;
  videos?: string[];
  combined_videos?: string[];
  error?: string;
  failed_stage?: string;
  params?: { video_subject?: string };
};

export type MptListData = {
  tasks?: MptTask[];
  total?: number;
  page?: number;
  page_size?: number;
};

async function readJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { error: "invalid_json" };
  }
}

export async function mptGet(path: string): Promise<{ status: number; json: unknown }> {
  const res = await fetch(path, { cache: "no-store" });
  return { status: res.status, json: await readJson(res) };
}

export async function mptPost(
  path: string,
  body: unknown,
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  return { status: res.status, json: await readJson(res) };
}

export async function mptDelete(
  path: string,
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(path, { method: "DELETE", cache: "no-store" });
  return { status: res.status, json: await readJson(res) };
}

export function unwrapData(json: unknown): unknown {
  if (!json || typeof json !== "object") return json;
  const rec = json as Record<string, unknown>;
  return "data" in rec ? rec.data : json;
}
