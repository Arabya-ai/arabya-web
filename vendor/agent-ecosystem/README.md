# Agent ecosystem (git submodules)

Ten upstream agent repositories for Cursor + Arabya development.

## Install

```bash
npm run agent-ecosystem:install
```

Or after clone:

```bash
git submodule update --init --depth 1 --recursive vendor/agent-ecosystem
bash scripts/sync-agent-skills.sh
bash scripts/sync-cursor-plugins-marketplace.sh
```

## Cursor

1. Reload Cursor window
2. `/plugin marketplace add .cursor/plugins`
3. Install recommended: `cursor-team-kit`, `orchestrate`, `playwright`, `github`
4. Master skill: `.cursor/skills/arabya-agent-ecosystem/SKILL.md`

See `manifest.json` for full repo list and routing.
