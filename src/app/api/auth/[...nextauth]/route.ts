import { handlers } from "@/auth";
import { AUTH_RATE_LIMIT, enforceRateLimit } from "@/lib/rate-limit";
import type { NextRequest } from "next/server";

async function withAuthRateLimit(
  handler: (req: NextRequest) => Promise<Response>,
  req: NextRequest,
): Promise<Response> {
  const limited = enforceRateLimit(req, {
    prefix: "auth",
    limit: AUTH_RATE_LIMIT,
  });
  if (limited) return limited;
  return handler(req);
}

export async function GET(req: NextRequest) {
  return withAuthRateLimit(handlers.GET, req);
}

export async function POST(req: NextRequest) {
  return withAuthRateLimit(handlers.POST, req);
}
