import { handlers } from "@/auth";
import { AUTH_RATE_LIMIT, enforceRateLimit } from "@/lib/rate-limit";

async function withAuthRateLimit(
  handler: (req: Request) => Promise<Response>,
  req: Request,
): Promise<Response> {
  const limited = enforceRateLimit(req, {
    prefix: "auth",
    limit: AUTH_RATE_LIMIT,
  });
  if (limited) return limited;
  return handler(req);
}

export async function GET(req: Request) {
  return withAuthRateLimit(handlers.GET, req);
}

export async function POST(req: Request) {
  return withAuthRateLimit(handlers.POST, req);
}
