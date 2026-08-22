#!/usr/bin/env bash
# Verify agent ecosystem install for Cursor + Arabya (post-merge checklist).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
FAIL=0

check() {
  if eval "$2" >/dev/null 2>&1; then
    echo "  OK  $1"
  else
    echo "  FAIL $1"
    FAIL=$((FAIL + 1))
  fi
}

echo "==> Agent ecosystem verification"

echo "-- Submodules (10 repos)"
for repo in deepseek-harness anthropic-skills openai-cookbook claude-cookbooks grok-build \
  openai-agents-python gemini-cookbook google-adk-python cursor-cookbook cursor-plugins; do
  check "$repo" "test -e vendor/agent-ecosystem/$repo/.git || test -f vendor/agent-ecosystem/$repo/README.md"
done

echo "-- Manifest & scripts"
check "manifest.json" "test -f vendor/agent-ecosystem/manifest.json"
check "install script" "test -x scripts/install-agent-ecosystem.sh"
check "sync skills script" "test -f scripts/sync-agent-skills.mjs"

echo "-- Cursor wiring"
check "plugin marketplace" "test -f .cursor/plugins/marketplace.json"
check "master skill" "test -f .cursor/skills/arabya-agent-ecosystem/SKILL.md"
check "routing rule" "test -f .cursor/rules/arabya-agent-ecosystem.mdc"
check "dag-task-runner skill" "test -f .cursor/skills/cursor-dag-task-runner/SKILL.md"
check "orchestrate skill" "test -f .cursor/skills/cursor-orchestrate/SKILL.md"
check "gemini index" "test -f .cursor/skills/gemini-cookbook-index/SKILL.md"
check "agents mirror" "test -f .agents/skills/arabya-agent-ecosystem/SKILL.md"

echo "-- Counts"
SKILL_COUNT="$(find .cursor/skills -mindepth 1 -maxdepth 1 -type d | wc -l | tr -d ' ')"
PLUGIN_COUNT="$(node -p "JSON.parse(require('fs').readFileSync('.cursor/plugins/marketplace.json','utf8')).plugins.length")"
echo "  INFO skills dirs: $SKILL_COUNT (expect >= 30)"
echo "  INFO marketplace plugins: $PLUGIN_COUNT (expect 33)"

echo "-- Arabya app (unchanged runtime)"
check "npm test" "npm run test"

if [[ "$FAIL" -gt 0 ]]; then
  echo ""
  echo "FAILED: $FAIL checks"
  exit 1
fi

echo ""
echo "All checks passed."
