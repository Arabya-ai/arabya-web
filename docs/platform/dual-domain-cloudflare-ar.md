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

## Optional later (needs root SSH)

If you get SSH as root:

```bash
# Add aliases in /etc/serveravatar-ols/arabyaorg.conf (vhAliases / vhDomain)
# then: /usr/local/lsws/bin/lswsctrl restart
```

After OLS serves `.com` natively, delete Worker routes in Cloudflare → Workers → arabyaai-proxy.
