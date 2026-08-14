/**
 * Dual-domain bridge: arabyaai.com → Contabo app (same as www.arabya.org).
 * Needed because ServerAvatar OLS app has no Domains UI for aliases.
 *
 * Auth (Google OAuth + session cookies) is canonical on www.arabya.org —
 * AUTH_URL / callback cannot span .org and .com. /login and /api/auth on
 * .com redirect to .org.
 *
 * Other requests: rewrite Host/Origin/Referer to the origin host so Next.js
 * Server Actions pass CSRF checks (browser Origin would otherwise be .com
 * while the upstream Host is .org → 500 → error.tsx «حدث خطأ»).
 */
const ORIGIN_HOST = "www.arabya.org";
const ORIGIN_ORIGIN = `https://${ORIGIN_HOST}`;
const ORIGIN_IP = "169.58.169.79";

addEventListener("fetch", (event) => {
  event.respondWith(handle(event.request));
});

function isCanonicalAuthPath(pathname) {
  return (
    pathname === "/login" ||
    pathname === "/en/login" ||
    pathname.startsWith("/api/auth")
  );
}

async function handle(request) {
  const incoming = new URL(request.url);

  // Session + OAuth live on .org (AUTH_URL). Keep the login flow there.
  if (isCanonicalAuthPath(incoming.pathname)) {
    const dest = new URL(request.url);
    dest.protocol = "https:";
    dest.hostname = ORIGIN_HOST;
    dest.port = "";
    return Response.redirect(dest.toString(), 302);
  }

  const target = new URL(request.url);
  target.hostname = ORIGIN_HOST;
  target.protocol = "https:";

  const headers = new Headers(request.headers);
  headers.set("Host", ORIGIN_HOST);
  headers.set("X-Forwarded-Host", ORIGIN_HOST);
  headers.set("X-Forwarded-Proto", "https");

  const origin = headers.get("Origin");
  if (origin) {
    try {
      const o = new URL(origin);
      if (o.hostname.endsWith("arabyaai.com")) {
        headers.set("Origin", ORIGIN_ORIGIN);
      }
    } catch {
      /* ignore bad Origin */
    }
  }

  const referer = headers.get("Referer");
  if (referer) {
    headers.set(
      "Referer",
      referer
        .replace(/https?:\/\/www\.arabyaai\.com/gi, ORIGIN_ORIGIN)
        .replace(/https?:\/\/arabyaai\.com/gi, ORIGIN_ORIGIN),
    );
  }

  const init = {
    method: request.method,
    headers,
    redirect: "manual",
    cf: { resolveOverride: ORIGIN_IP },
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const response = await fetch(target.toString(), init);
  const out = new Headers(response.headers);

  const loc = out.get("location");
  if (loc) {
    out.set(
      "location",
      loc
        .replace(/https?:\/\/www\.arabya\.org/gi, incoming.origin)
        .replace(/https?:\/\/arabya\.org/gi, incoming.origin),
    );
  }

  try {
    const cookies =
      typeof response.headers.getSetCookie === "function"
        ? response.headers.getSetCookie()
        : [];
    if (cookies.length) {
      out.delete("set-cookie");
      for (const c of cookies) {
        out.append(
          "set-cookie",
          c
            .replace(
              /;\s*Domain=\.?www\.arabya\.org/gi,
              `; Domain=${incoming.hostname}`,
            )
            .replace(/;\s*Domain=\.?arabya\.org/gi, "; Domain=.arabyaai.com"),
        );
      }
    }
  } catch {
    /* ignore cookie rewrite failures */
  }

  out.set("x-arabya-bridge", "arabyaai-proxy");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: out,
  });
}
