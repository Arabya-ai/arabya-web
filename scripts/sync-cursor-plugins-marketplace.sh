#!/usr/bin/env bash
# Mount vendored cursor/plugins as a project-local Cursor marketplace.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UPSTREAM="$ROOT/vendor/agent-ecosystem/cursor-plugins/.cursor-plugin/marketplace.json"
DEST="$ROOT/.cursor/plugins/marketplace.json"
PLUGINS_ROOT="$ROOT/vendor/agent-ecosystem/cursor-plugins"

if [[ ! -f "$UPSTREAM" ]]; then
  echo "ERROR: run install-agent-ecosystem.sh first (missing cursor-plugins submodule)" >&2
  exit 1
fi

mkdir -p "$ROOT/.cursor/plugins"

node <<NODE
const fs = require("fs");
const path = require("path");

const upstream = JSON.parse(fs.readFileSync("$UPSTREAM", "utf8"));
const recommended = new Set(JSON.parse(fs.readFileSync("$ROOT/vendor/agent-ecosystem/manifest.json", "utf8")).recommendedPlugins || []);

const marketplace = {
  name: "arabya-agent-ecosystem",
  owner: {
    name: "Arabya",
    email: "plugins@arabya.org",
  },
  metadata: {
    description: "Arabya project marketplace — vendored cursor/plugins + agent ecosystem for Contabo production.",
    upstream: "https://github.com/cursor/plugins",
    vendorRoot: "vendor/agent-ecosystem/cursor-plugins",
  },
  plugins: (upstream.plugins || []).map((p) => ({
    ...p,
    source: path.join("vendor/agent-ecosystem/cursor-plugins", p.source),
    recommended: recommended.has(p.name),
  })),
};

fs.writeFileSync("$DEST", JSON.stringify(marketplace, null, 2) + "\n");
console.log("Wrote .cursor/plugins/marketplace.json (" + marketplace.plugins.length + " plugins)");
NODE
