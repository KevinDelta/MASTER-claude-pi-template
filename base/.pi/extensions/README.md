# Extensions

This directory is where pi loads TypeScript extensions at startup. Extensions hook into pi's event lifecycle, add custom tools, and enforce safety policies. They run with full system permissions.

---

## How Extensions Work

Pi auto-discovers `.ts` files in this directory (configured via `extensions.paths` in `.pi/settings.json`). Each extension exports a default function that receives the pi instance and registers hooks:

```typescript
export default function(pi: Pi) {
  pi.on("before_agent_start", async (ctx) => {
    // runs before every agent turn
  });

  pi.on("tool_call", async (ctx) => {
    // can inspect or block any tool call
    if (ctx.tool === "bash" && ctx.input.command.includes("rm -rf")) {
      ctx.block("Destructive command blocked by safety extension");
    }
  });
}
```

Hot-reload during development: `/reload` in the pi session.

---

## Installing Community Extensions

```bash
# From GitHub
pi install git:github.com/MasuRii/pi-permission-system

# From npm
pi install npm:pi-memory

# Installed extensions land in ~/.pi/agent/extensions/ (global) or .pi/extensions/ (project)
```

---

## Safety Extension Options

Three tiers, pick based on how much enforcement you need:

### Tier 1 — Lightweight (recommended default)

**pi-safety** by marcfargas
- Glob-based READ/WRITE classification of bash commands
- Safe commands run without prompt; write commands require approval
- Zero config, drop-in

```bash
pi install git:github.com/marcfargas/pi-safety
```

### Tier 2 — Config-driven (for stricter control)

**pi-permission-system** by MasuRii
- Centralized permission config (`permissions-config.json`)
- Pattern-based rules with `allow` / `ask` / `deny` per tool
- Last matching rule wins; `*` wildcard supported
- Covers bash, write, edit, MCP, skills

```bash
pi install git:github.com/MasuRii/pi-permission-system
```

After installing, configure via `permissions-config.json` in this directory (template provided).

### Tier 3 — AST-level analysis (for production / high-stakes work)

**pi-safeguard** (v2.0+)
- Parses bash commands as AST before execution
- Flags known-dangerous patterns: `rm -rf`, `.env` reads, `curl` with secrets, `sudo`
- Dangerous commands evaluated by a secondary model before allowing
- Highest protection, highest latency overhead

```bash
pi install git:github.com/pi-agent/pi-safeguard
```

---

## Semantic Memory Extension (agentmemory)

**agentmemory** ([github.com/rohitg00/agentmemory](https://github.com/rohitg00/agentmemory)) adds a semantic intelligence layer on top of pi-memory's BM25 keyword injection. The two work in parallel — pi-memory handles fast keyword-matched injection; agentmemory adds vector search, knowledge graph traversal, and automatic tier-based consolidation.

### What agentmemory adds

| Capability | pi-memory | agentmemory |
|------------|-----------|-------------|
| Keyword search (BM25) | ✓ | ✓ |
| Semantic / vector search | — | ✓ |
| Knowledge graph | — | ✓ |
| Pattern detection across sessions | — | ✓ |
| Auto-capture of tool call observations | — | ✓ |
| Memory tier consolidation | — | ✓ (Working → Episodic → Semantic → Procedural) |
| Sync back to MEMORY.md | — | ✓ (Claude Bridge) |

### Setup

```bash
# 1. Clone and start the agentmemory service
git clone https://github.com/rohitg00/agentmemory
cd agentmemory

# Option A: Docker (recommended)
docker-compose up -d

# Option B: Node
npm install && npm start
```

Confirm the service is running:
```bash
curl http://localhost:3111/health
# → { "status": "ok" }
```

### Configure the project

```bash
# Copy the env template and fill in your project values
cp .pi/.env.example .pi/.env
```

Key variables in `.pi/.env`:
- `AGENTMEMORY_URL` — service URL (default `http://localhost:3111`)
- `AGENTMEMORY_PROJECT_ID` — project namespace (e.g. `client-acme`, `q2-sprint`)
- `AGENTMEMORY_TOKEN_BUDGET` — tokens to inject per turn (default `2000`)
- `AGENTMEMORY_AUTO_CAPTURE` — auto-capture tool calls as observations (default `true`)
- `CLAUDE_BRIDGE_SYNC` — sync consolidated memory back to MEMORY.md (default `false`)

### How the bridge extension works

`agentmemory-bridge.ts` (in this directory) connects automatically:

1. **`session_start`** — health check sets `available` flag; logs connection status or graceful skip message
2. **`before_agent_start`** — calls `memory_recall` with the current user message → injects semantically relevant memory into the system prompt prefix (in addition to pi-memory's BM25 injection)
3. **`tool_call`** — captures write/edit/bash executions as working memory observations (skips read-only and memory tools)
4. **`agent_end`** — calls `memory_consolidate` to promote Working → Episodic → Semantic tiers, then (if `CLAUDE_BRIDGE_SYNC=true`) syncs consolidated memories back to `memory/MEMORY.md`

**Graceful degradation:** if agentmemory is down, `available` stays `false` and every hook skips silently. Pi-memory continues without interruption.

### When to enable CLAUDE_BRIDGE_SYNC

Enable it for:
- Engagements longer than a week (cross-session pattern detection pays off)
- Client work where MEMORY.md is reviewed or committed to git
- Projects where the pi agent will run without Claude Code in the loop

Keep it off for:
- Short sprints (MEMORY.md doesn't accumulate enough for consolidation to matter)
- Experimental / exploratory work where you don't want noisy syncs

---

## What `permissions-config.json` Does

When pi-permission-system is installed, it reads `permissions-config.json` in this directory. The template is pre-populated with sensible defaults:

- Destructive bash commands (`rm -rf`, `git push --force`) → **deny**
- Sensitive file reads (`.env`, `auth.json`, `secrets.*`) → **deny**
- Safe read-only commands (`git status`, `git diff`, `ls`) → **allow**
- Everything else → **ask**

Customize the rules for your project's specific risk surface.

---

## Writing a Custom Extension

Minimal skeleton:

```typescript
// .pi/extensions/my-extension.ts
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function(pi: ExtensionAPI) {
  // React to session start (reason: "startup" | "reload" | "new" | "resume" | "fork")
  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify("Extension loaded!", "info");
  });

  // Intercept tool calls — block, allow, or log
  pi.on("tool_call", async (_event, ctx) => {
    // _event.tool: "bash" | "read" | "write" | "edit"
    // _event.input: tool-specific parameters
    // ctx.block(reason): prevent execution
  });

  // Inject context before every agent turn
  pi.on("before_agent_start", async (_event, ctx) => {
    // ctx.ui.notify(message, type): surface info to user
    // ctx.ui.select(prompt, options): interactive selection
    // ctx.ui.confirm(title, message): confirmation dialog
  });

  // Register a custom tool the LLM can call
  pi.registerTool({
    name: "my_tool",
    description: "What this tool does and when to use it",
    parameters: { /* TypeBox schema */ },
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return {
        content: [{ type: "text", text: "Result" }]
      };
    }
  });
}
```

Full hook reference: `github.com/badlogic/pi-mono/packages/coding-agent/docs/extensions.md`
