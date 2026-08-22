---
name: arabya-agent-ecosystem
description: Master routing skill for Arabya's ten vendored agent repos (DeepSeek Harness, Claude Skills, OpenAI/Claude/Gemini cookbooks, Grok Build, OpenAI Agents SDK, Google ADK, Cursor Cookbook/Plugins). Use when building agents, MCP tools, multi-agent flows, or choosing which upstream cookbook to follow for Lughawi, admin, or NLP sidecar work.
---

# Arabya Agent Ecosystem

This project vendors **ten upstream agent repositories** under `vendor/agent-ecosystem/` (git submodules). They are wired into Cursor via synced skills, a local plugin marketplace, and optional Python lab.

## Install / refresh

```bash
bash scripts/install-agent-ecosystem.sh
```

Then in Cursor: `/plugin marketplace add .cursor/plugins` and install recommended plugins (cursor-team-kit, orchestrate, playwright, github).

## Repo routing (pick the right upstream)

| Task | Use | Path |
|------|-----|------|
| Plugin-first harness design | DeepSeek Harness | `vendor/agent-ecosystem/deepseek-harness/` |
| Document generation (docx/pdf) | Claude Skills | `.cursor/skills/anthropic-docx`, `anthropic-pdf` |
| Web UI testing / Playwright flows | anthropic-webapp-testing + playwright plugin | `.cursor/skills/anthropic-webapp-testing` |
| MCP server design | anthropic-mcp-builder | `.cursor/skills/anthropic-mcp-builder` |
| OpenAI function calling / evals | OpenAI Cookbook index | `.cursor/skills/openai-cookbook-index/` |
| Claude agents / tool use | Claude Cookbooks index | `.cursor/skills/claude-cookbooks-index/` |
| **Google Gemini (production default)** | Gemini Cookbook index | `.cursor/skills/gemini-cookbook-index/` + `src/lib/lughawi/ai-gateway.ts` |
| Multi-agent Python prototypes | OpenAI Agents SDK | `services/agent-lab/` + `openai-agents-sdk-index` |
| Contabo code-first agents | Google ADK | `services/agent-lab/` + `google-adk-index` |
| Parallel cloud/local subagents | cursor-orchestrate, cursor-dag-task-runner | `.cursor/skills/cursor-orchestrate`, `cursor-dag-task-runner` |
| CI / ship / verify | cursor-team-kit skills | `cursor-verify-this`, `cursor-fix-ci`, `cursor-review-and-ship` |
| Terminal coding agent (owner dev) | Grok Build | `grok-build-index` (not production) |

Full manifest: `vendor/agent-ecosystem/manifest.json`.

## Arabya hard constraints (always)

1. **Production = Contabo only** (PM2 + Nginx). Never Vercel.
2. **Lughawi / NLP**: Contabo-complete without Hugging Face token; HF optional when `LUGHAWI_HF_TOKEN` + `LUGHAWI_PREFER_HF=1`.
3. **Google models**: newest stable Flash GA first (`lughawi-newest-ai-models` rule).
4. **RTL / brand**: teal tokens (`--brand`, `--surface`, `--ink`) for any UI from agent-generated code.
5. **Guest reading** stays login-free; do not force accounts on mushaf/study routes.

## Workflow patterns

### Feature with agent + UI
1. `/speckit-specify` → plan → implement (existing Speckit skills)
2. `cursor-verify-this` before PR
3. `anthropic-webapp-testing` or Playwright plugin for RTL mushaf/lughawi routes
4. `cursor-review-and-ship` for Contabo deploy checklist

### NLP / Lughawi sidecar experiment
1. Read `gemini-cookbook-index` or `google-adk-index`
2. Prototype in `services/agent-lab/` venv
3. Integrate winning pattern into `services/arabya-nlp/` only after tests + owner OK

### Large parallel task
1. `cursor-orchestrate` or `cursor-dag-task-runner`
2. Keep Contabo deploy as final verification step

## Synced skill names

See `manifest.json` → `syncedSkills`. Re-run `bash scripts/sync-agent-skills.sh` after submodule updates.
