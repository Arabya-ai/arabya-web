# Dual domain: arabya.org + arabyaai.com

Both hostnames serve the same Contabo app (`169.58.169.79`).

## Cloudflare DNS (done)

| Zone | Records |
|------|---------|
| `arabya.org` | `A @` + `A www` → `169.58.169.79` (Proxied), SSL **Full** |
| `arabyaai.com` | `A @` + `A www` → `169.58.169.79` (Proxied), SSL **Full**, Always HTTPS **on** |

## Why a Worker?

ServerAvatar’s OLS Node app (`arabyaorg`) has **no Domains / Aliases UI**.  
OpenLiteSpeed only answers Next.js for `www.arabya.org`. Requests with Host `www.arabyaai.com` hit the ServerAvatar default page.

**Bridge:** Worker `arabyaai-proxy` (routes `arabyaai.com/*` and `www.arabyaai.com/*`) fetches the Contabo origin with SNI/Host `www.arabya.org`, then returns the response on the `.com` URL.

Script: `deploy/cloudflare/arabyaai-proxy.worker.js`

### Auth / login (important)

Google OAuth and session cookies follow `AUTH_URL` → **`https://www.arabya.org`**.  
They cannot be shared across `.org` and `.com`.

The Worker therefore:

1. **Redirects** `/login`, `/en/login`, and `/api/auth/*` on `.com` → `www.arabya.org` (same path + query).
2. **Rewrites** inbound `Host` / `Origin` / `Referer` to `www.arabya.org` on other requests so Next.js Server Actions do not fail CSRF (that mismatch previously showed «حدث خطأ» on `/login` when the Google button POSTed).

App middleware mirrors the login redirect if OLS ever serves `.com` without the Worker.

## Optional later (needs root SSH)

If you get SSH as root:

```bash
# Add aliases in /etc/serveravatar-ols/arabyaorg.conf (vhAliases / vhDomain)
# then: /usr/local/lsws/bin/lswsctrl restart
```

After OLS serves `.com` natively, delete Worker routes in Cloudflare → Workers → arabyaai-proxy.
