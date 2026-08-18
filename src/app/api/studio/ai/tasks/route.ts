import { MPT_JSON_LIMIT, proxyMptJson, requireMptSession } from "@/lib/mpt-proxy";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const gate = await requireMptSession(MPT_JSON_LIMIT);
  if ("error" in gate) return gate.error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const pageSize = Math.min(
    50,
    Math.max(1, Number.parseInt(searchParams.get("page_size") || "10", 10) || 10),
  );

  return proxyMptJson({
    method: "GET",
    pathname: "/api/v1/tasks",
    search: `?page=${page}&page_size=${pageSize}`,
    timeoutMs: 15_000,
  });
}
