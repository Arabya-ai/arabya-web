#!/usr/bin/env bash
# Wire LiteSpeed (ServerAvatar OLS) reverse proxies for Arabya SaaS UIs.
# Prereq: DNS A records for chat.arabya.org + analytics.arabya.org → Contabo IP
# Usage on Contabo: bash scripts/contabo-saas-ols-proxy.sh
set -euo pipefail

OLS_DIR="/etc/serveravatar-ols"
CHAT_CONF="${OLS_DIR}/arabya-saas-chat.conf"
ANALYTICS_CONF="${OLS_DIR}/arabya-saas-analytics.conf"
HTTPD_CONF="/usr/local/lsws/conf/httpd_config.conf"
CERT_LIVE="/etc/letsencrypt/live/arabyaorg"

need_dns() {
  echo "DNS required before TLS:"
  echo "  chat.arabya.org       A  → Contabo public IP"
  echo "  analytics.arabya.org  A  → Contabo public IP"
}

if [[ ! -d "$OLS_DIR" ]]; then
  echo "OLS ServerAvatar dir not found: $OLS_DIR" >&2
  exit 1
fi

cat >"$CHAT_CONF" <<'EOF'
virtualhost arabya-saas-chat {
    listeners  Default,DefaultHttps
    vhDomain                   chat.arabya.org

    rewrite  {
        enable                  1
        RewriteCond %{HTTPS} !=on
        RewriteRule !^/.well-known($|/) https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
    }

    vhssl {
        keyFile                 /etc/letsencrypt/live/arabyaorg/privkey.pem
        certFile                /etc/letsencrypt/live/arabyaorg/fullchain.pem
        certChain               1
    }

    extprocessor chatwoot-node {
      type                    proxy
      address                 127.0.0.1:14000
      maxConns                80
      initTimeout             120
      retryTimeout            0
      respBuffer              0
    }

    context / {
      type                    proxy
      handler                 chatwoot-node
      addDefaultCharset       off
    }
}
EOF

cat >"$ANALYTICS_CONF" <<'EOF'
virtualhost arabya-saas-analytics {
    listeners  Default,DefaultHttps
    vhDomain                   analytics.arabya.org

    rewrite  {
        enable                  1
        RewriteCond %{HTTPS} !=on
        RewriteRule !^/.well-known($|/) https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
    }

    vhssl {
        keyFile                 /etc/letsencrypt/live/arabyaorg/privkey.pem
        certFile                /etc/letsencrypt/live/arabyaorg/fullchain.pem
        certChain               1
    }

    extprocessor umami-node {
      type                    proxy
      address                 127.0.0.1:13000
      maxConns                40
      initTimeout             60
      retryTimeout            0
      respBuffer              0
    }

    context / {
      type                    proxy
      handler                 umami-node
      addDefaultCharset       off
    }
}
EOF

# Ensure httpd includes these vhosts once
for conf in arabya-saas-chat.conf arabya-saas-analytics.conf; do
  if ! grep -q "serveravatar-ols/${conf}" "$HTTPD_CONF" 2>/dev/null; then
    echo "include ${OLS_DIR}/${conf}" >>"$HTTPD_CONF"
    echo "Included ${conf} in httpd_config.conf"
  fi
done

need_dns
echo
echo "Expand certificate (run after DNS propagates):"
echo "  certbot certonly --webroot -w /usr/local/lsws/Example/html \\"
echo "    -d arabya.org -d www.arabya.org -d chat.arabya.org -d analytics.arabya.org \\"
echo "    --expand --non-interactive --agree-tos -m contact@arabya.org || \\"
echo "  certbot certonly --nginx -d arabya.org -d www.arabya.org -d chat.arabya.org -d analytics.arabya.org --expand"
echo
echo "Then: /usr/local/lsws/bin/lswsctrl restart"
echo "Update Chatwoot FRONTEND_URL=https://chat.arabya.org in /var/www/arabya-saas/.env.saas and recreate chatwoot-web."
echo "Set NEXT_PUBLIC_* in /var/www/arabya-web/.env and pm2 restart arabya-web --update-env"
