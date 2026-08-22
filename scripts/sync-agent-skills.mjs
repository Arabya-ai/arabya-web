#!/usr/bin/env node
/**
 * Copy upstream skills from vendor/agent-ecosystem/manifest.json into .cursor/skills and .agents/skills.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const vendorRoot = path.join(root, "vendor/agent-ecosystem");
const manifestPath = path.join(vendorRoot, "manifest.json");
const cursorSkills = path.join(root, ".cursor/skills");
const agentsSkills = path.join(root, ".agents/skills");

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function copySkillDir(src, dest) {
  if (!fs.existsSync(src)) {
    console.warn(`WARN: missing skill source ${src}`);
    return false;
  }
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
  return true;
}

fs.mkdirSync(cursorSkills, { recursive: true });
fs.mkdirSync(agentsSkills, { recursive: true });

for (const entry of manifest.syncedSkills || []) {
  const src = path.join(vendorRoot, entry.source);
  const cursorDest = path.join(cursorSkills, entry.target);
  const agentsDest = path.join(agentsSkills, entry.target);
  if (copySkillDir(src, cursorDest)) {
    console.log(`  synced ${entry.target} -> .cursor/skills/`);
    copySkillDir(src, agentsDest);
  }
}

const indexSkills = [
  {
    name: "openai-cookbook-index",
    body: `# OpenAI Cookbook Index (Arabya)

Read recipes from \`vendor/agent-ecosystem/openai-cookbook/\`.

## When to use
- Function calling / structured outputs for Lughawi API routes
- Evals and regression tests for Arabic NLP prompts
- RAG patterns for hadith/heritage search

## Key paths
- \`examples/\` — runnable notebooks
- \`articles/\` — deep dives

Prefer Contabo-local fallbacks per project rules; OpenAI is optional acceleration only.
`,
  },
  {
    name: "claude-cookbooks-index",
    body: `# Claude Cookbooks Index (Arabya)

Read from \`vendor/agent-ecosystem/claude-cookbooks/\`.

## When to use
- Tool-use agent patterns for \`/admin/ops\`
- Extended thinking for complex Arabic morphology tasks
- \`claude_agent_sdk/\` when prototyping admin automations

Production remains Contabo + Google Gemini defaults in ai-gateway.ts unless owner overrides.
`,
  },
  {
    name: "gemini-cookbook-index",
    body: `# Gemini Cookbook Index (Arabya)

Read from \`vendor/agent-ecosystem/gemini-cookbook/\`.

## When to use
- Multimodal (audio/image) experiments with Lughawi STT
- Batch + caching for large Quran analysis jobs
- Aligns with \`GOOGLE_MODELS_NEWEST_FIRST\` in \`src/lib/lughawi/ai-gateway.ts\`

Always keep newest Flash GA first; auto-fallback on 404 per lughawi-newest-ai-models rule.
`,
  },
  {
    name: "deepseek-harness-index",
    body: `# DeepSeek Harness Index (Arabya)

Vendor: \`vendor/agent-ecosystem/deepseek-harness/\`.

## When to use
- Plugin architecture reference for \`services/arabya-nlp\` agent stages
- Local experiment: \`npx @deepseek-ai/dsh web\` (dev only, not Contabo production)

Everything-is-a-plugin pattern informs optional HF vs Contabo engine swaps in Lughawi.
`,
  },
  {
    name: "grok-build-index",
    body: `# Grok Build Index (Arabya)

Vendor: \`vendor/agent-ecosystem/grok-build/\`.

## When to use
- Terminal agent UX reference for owner-side coding (not deployed to arabya.org)
- Install: \`curl -fsSL https://x.ai/cli/install.sh | bash\`

Do not wire Grok into production PM2 stack unless owner explicitly requests.
`,
  },
  {
    name: "openai-agents-sdk-index",
    body: `# OpenAI Agents SDK Index (Arabya)

Vendor: \`vendor/agent-ecosystem/openai-agents-python/\`.
Lab: \`services/agent-lab/\`.

## When to use
- Multi-agent handoffs prototyping for Lughawi pipeline (rule → neural → LLM)
- Examples: \`examples/handoffs/\`, \`examples/mcp/\`

Run inside agent-lab venv; never hard-require OpenAI in production user flows.
`,
  },
  {
    name: "google-adk-index",
    body: `# Google ADK Index (Arabya)

Vendor: \`vendor/agent-ecosystem/google-adk-python/\`.
Lab: \`services/agent-lab/\`.

## When to use
- Code-first agents on Contabo for \`services/arabya-nlp\` DevOps agent
- Samples under \`contributing/samples/\`

Prefer Gemini newest models; deploy via PM2 sidecar only after owner approval.
`,
  },
];

for (const skill of indexSkills) {
  const frontmatter = `---
name: ${skill.name}
description: Arabya routing index for ${skill.name.replace(/-/g, " ")} — points agents to vendored upstream cookbook/harness paths.
---

`;
  for (const base of [cursorSkills, agentsSkills]) {
    const dir = path.join(base, skill.name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, "SKILL.md"), frontmatter + skill.body);
  }
  console.log(`  wrote index ${skill.name}`);
}

const master = path.join(cursorSkills, "arabya-agent-ecosystem");
if (fs.existsSync(master)) {
  const dest = path.join(agentsSkills, "arabya-agent-ecosystem");
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(master, dest, { recursive: true });
  console.log("  mirrored arabya-agent-ecosystem -> .agents/skills/");
}

console.log("Skills sync complete.");
