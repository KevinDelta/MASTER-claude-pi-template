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

## Semantic Memory

**v2 (recommended):** `memory-db.ts` — domain-layer extension using embedded SQLite + sqlite-vec. No external service. No Docker. One file per domain at `~/.pi/domain/<name>/memory.db`.

**v1 (project-layer fallback):** `agentmemory-bridge.ts` — connects to a running agentmemory HTTP service. Available for projects that don't use the v2 domain layer.

### v2 — memory-db.ts (domain layer)

The `memory-db.ts` extension lives in the domain template at `domain/.pi/extensions/memory-db.ts` and deploys to `~/.pi/domain/<name>/.pi/extensions/memory-db.ts` via `install.sh`.

| Capability | pi-memory | memory-db |
|------------|-----------|-----------|
| Keyword search (BM25) | ✓ | ✓ |
| Semantic / vector search | — | ✓ (via ollama) |
| Cross-project observation capture | — | ✓ |
| Scratchpad across projects | — | ✓ |
| Goals table + delta tracking | — | ✓ |
| Embedded — no daemon, no Docker | ✓ | ✓ |

**Prerequisites:**

```bash
# Install npm packages (once per machine)
npm install -g better-sqlite3 sqlite-vec

# Install ollama and pull embedding model
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull nomic-embed-text
```

**Configure per project** — add to `<project-root>/.pi/.env`:

```bash
PI_PROJECT_ID=my-project-slug  # tags observations to this project in the domain DB
```

The domain-level env (`~/.pi/domain/<name>/.pi/.env`) handles all other config. See `.env.example` in the domain template.

**Graceful degradation:** if the DB is unavailable, all hooks return early. If ollama is unavailable, FTS search still works — only vector recall is skipped.

---

### v1 — agentmemory-bridge.ts (project layer, backwards-compatible)

**agentmemory** ([github.com/rohitg00/agentmemory](https://github.com/rohitg00/agentmemory)) runs as a background HTTP service (default: `localhost:3111`). Use this for projects not using the v2 domain layer.

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
2. **`before_agent_start`** — calls `memory_recall` with the current user message → injects semantically relevant memory into the system prompt prefix
3. **`tool_call`** — captures write/edit/bash executions as working memory observations (skips read-only and memory tools)
4. **`agent_end`** — calls `memory_consolidate` to promote Working → Episodic → Semantic tiers, then (if `CLAUDE_BRIDGE_SYNC=true`) syncs consolidated memories back to `memory/MEMORY.md`

**Graceful degradation:** if agentmemory is down, every hook skips silently. Pi-memory continues without interruption.

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
