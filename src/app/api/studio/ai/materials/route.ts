import { MPT_JSON_LIMIT, proxyMptJson, requireMptSession } from "@/lib/mpt-proxy";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireMptSession(MPT_JSON_LIMIT);
  if ("error" in gate) return gate.error;

  return proxyMptJson({
    method: "GET",
    pathname: "/api/v1/video_materials",
    timeoutMs: 15_000,
  });
}
