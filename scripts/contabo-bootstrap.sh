#!/usr/bin/env bash
# Contabo / Ubuntu bootstrap for arabya-web (run as root once).
# Prefer ServerAvatar if you are not comfortable with SSH.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/arabya-web}"
REPO_URL="${REPO_URL:-https://github.com/Arabya-ai/arabya-web.git}"
BRANCH="${BRANCH:-main}"
NODE_MAJOR="${NODE_MAJOR:-22}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ufw build-essential

if ! command -v node >/dev/null 2>&1; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
  apt-get install -y nodejs
fi

npm install -g pm2

mkdir -p "$(dirname "$APP_DIR")"
if [[ ! -d "$APP_DIR/.git" ]]; then
  git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$APP_DIR"
fi

cd "$APP_DIR"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm ci
npm run build

# Create .env.production.local manually before first start:
# AUTH_SECRET / AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET / AUTH_URL / ARABYA_ADMIN_EMAILS

pm2 delete arabya-web >/dev/null 2>&1 || true
pm2 start deploy/contabo/ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root | tail -n 1 || true

ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable || true

echo "Bootstrap done. Put Nginx/Caddy in front of 127.0.0.1:3000 and add SSL."
echo "App dir: $APP_DIR"
