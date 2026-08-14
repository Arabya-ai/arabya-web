/**
 * Dual-domain bridge: arabyaai.com → Contabo app (same as www.arabya.org).
 * Needed because ServerAvatar OLS app has no Domains UI for aliases.
 */
addEventListener("fetch", (event) => {
  event.respondWith(handle(event.request));
});

async function handle(request) {
  const incoming = new URL(request.url);
  const target = new URL(request.url);
  target.hostname = "www.arabya.org";
  target.protocol = "https:";

  const init = {
    method: request.method,
    headers: request.headers,
    redirect: "manual",
    cf: { resolveOverride: "169.58.169.79" },
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
  }

  const response = await fetch(target.toString(), init);
  const headers = new Headers(response.headers);

  const loc = headers.get("location");
  if (loc) {
    headers.set(
      "location",
      loc
        .replace(/https?:\/\/www\.arabya\.org/gi, incoming.origin)
        .replace(/https?:\/\/arabya\.org/gi, incoming.origin),
    );
  }

  // Rewrite Set-Cookie Domain if present (Headers.getSetCookie in modern runtimes)
  try {
    const cookies = typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];
    if (cookies.length) {
      headers.delete("set-cookie");
      for (const c of cookies) {
        headers.append(
          "set-cookie",
          c
            .replace(/;\s*Domain=\.?www\.arabya\.org/gi, `; Domain=${incoming.hostname}`)
            .replace(/;\s*Domain=\.?arabya\.org/gi, "; Domain=.arabyaai.com"),
        );
      }
    }
  } catch {
    /* ignore cookie rewrite failures */
  }

  headers.set("x-arabya-bridge", "arabyaai-proxy");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
