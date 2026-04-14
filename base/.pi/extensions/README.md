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
