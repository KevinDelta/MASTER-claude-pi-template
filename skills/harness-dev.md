---
name: harness-dev
description: Dev flow for building and iterating on a pi agent harness. Load when working on AGENTS.md, settings.json, skills, or extensions — not when doing project work inside the harness.
---

# harness-dev

## Purpose

Guide the process of building, modifying, and testing the pi agent harness itself. The harness is the infrastructure the agent runs on — AGENTS.md, settings.json, skills, extensions. This skill is meta: it's loaded when you're working on the harness, not when you're using it.

## When to Use

- Adding or modifying a skill file
- Updating the routing table in AGENTS.md
- Changing tool permissions or model config in settings.json
- Writing or installing an extension
- Debugging unexpected agent behavior
- Onboarding a new project from the base/ template

---

## Adding a Skill

### File structure

```markdown
---
name: skill-name-with-hyphens
description: One sentence. What it does and when to load it. This appears in the system prompt — make it specific enough that the agent knows exactly when this skill applies.
---

# skill-name

## Purpose
[What this skill does and why it exists]

## When to Use
[Specific conditions — not "when relevant" but "when writing client-facing deliverables that will be reviewed by stakeholders"]

---

## [Content sections]
```

### Naming rules
- 1–64 lowercase alphanumeric characters plus hyphens
- No leading, trailing, or consecutive hyphens
- Name must match what the routing table references

### Location
- Universal skills (apply to many projects): `skills/` in this repo
- Project-specific skills: `skills/` in the project root (same path configured in `settings.json → skills.paths`)

### Connecting to the routing table
After creating the skill, add it to the routing table in AGENTS.md:

```
| [task type] | /[workspace] | [context files] | [skill-name].md |
```

### Testing skill discovery
Start a pi session and run `/skills` — it lists all discovered skills with their descriptions. If your skill is missing, check:
1. Frontmatter has `name` and `description`
2. The file path matches the glob in `settings.json → skills.paths`
3. No YAML syntax errors in the frontmatter

---

## Modifying the Routing Table

The routing table in AGENTS.md is a contract. Every row maps a task type to everything the agent needs to do that work. Changing it changes how the agent orients to every task of that type.

### When to add a row
- A new type of work is being done in the project that wasn't covered before
- The agent is loading the wrong context for a specific task type
- A task type consistently produces output that needs a different skill

### When to modify a row
- A workspace was renamed
- A context file was added that should be read before this task type
- A skill was added that applies to this work

### What "Workspace" means
The workspace column is the directory the agent should work in. If the task doesn't have a specific workspace (session start, session end), use `—`.

### Verify after changes
After modifying the routing table: start a fresh pi session, describe a task matching the changed row, and observe whether the agent loads the correct files before producing output. If it doesn't read the right context, the row description may not be specific enough.

---

## Updating settings.json

### Safe changes (no restart needed if hot-reload is active)
- `defaultThinkingLevel` — takes effect on next turn
- `tools` permission policies — takes effect on next tool call

### Changes that require session restart
- `model.name` — requires reload to switch providers
- `skills.paths` — requires reload to re-discover skills
- `extensions.paths` — requires reload to register extension hooks
- `memory.dir` — requires reload to point pi-memory at new path

### Thinking level tradeoffs

| Level | Use When |
|-------|---------|
| `off` / `minimal` | Routine edits, formatting tasks, simple lookups |
| `low` | Standard development work |
| `medium` | Multi-file tasks, spec writing, architectural decisions |
| `high` / `xhigh` | Complex system design, ambiguous requirements, debugging hard problems |

Higher thinking levels increase latency and token cost. Don't default to `xhigh` for everything.

---

## Installing and Writing Extensions

### Install a community extension

```bash
# From GitHub (most common)
pi install git:github.com/user/repo

# From npm
pi install npm:package-name
```

Installed extensions land in `~/.pi/agent/extensions/` (global) or `.pi/extensions/` (project). Hot-reload with `/reload`.

### Write a custom extension

Minimal skeleton — saves to `.pi/extensions/my-extension.ts`:

```typescript
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function(pi: ExtensionAPI) {
  // Inject context before every agent turn
  pi.on("before_agent_start", async (_event, ctx) => {
    ctx.ui.notify("Session ready.", "info");
  });

  // Intercept tool calls
  pi.on("tool_call", async (_event, ctx) => {
    if (_event.tool === "bash" && _event.input?.command?.startsWith("rm -rf")) {
      ctx.block("Destructive delete blocked. Use explicit file paths.");
    }
  });

  // React to session start (reason: "startup" | "reload" | "new" | "resume" | "fork")
  pi.on("session_start", async (_event, ctx) => {
    console.log("Session started:", _event.reason);
  });
}
```

Hot-reload after saving: `/reload` in the active pi session.

### Debug an extension

Add `console.log` statements — output appears in the pi terminal. For more complex debugging, use `ctx.injectMessage` to make the extension's state visible to the agent:

```typescript
pi.on("before_agent_start", async (ctx) => {
  ctx.injectMessage("system", `[debug] Extension loaded. Memory dir: ${process.env.PI_MEMORY_DIR}`);
});
```

Remove debug output before treating the extension as production.

---

## Debugging Unexpected Agent Behavior

When the agent does something unexpected, work through this sequence:

### 1. Check what context was loaded

Ask the agent directly: "What did you read before starting this task?" The agent should name the files from the routing table. If it names the wrong files (or nothing), the routing table row may be ambiguous.

### 2. Check skill loading

Run `/skills` to see discovered skills. If a skill is missing, check the frontmatter and the `skills.paths` config.

### 3. Check memory injection

At session start, pi-memory injects up to 16K of context. If the agent seems to have wrong information from a past session, check `memory/MEMORY.md` and `memory/SCRATCHPAD.md` for stale entries. Update or remove them.

### 4. Check the system prompt

Run `/prompt` (if available in your pi version) to see what's actually in the system prompt. This reveals what APPEND_SYSTEM.md contributed, what skills descriptions are visible, and what pi-memory injected.

### 5. Thinking level

If the agent is making shallow decisions on complex tasks, raise `defaultThinkingLevel` to `high` and retry. This often resolves issues where the agent was truncating its reasoning.

---

## Harness Development Checklist

Before shipping a harness update to a live project:

- [ ] All skills have valid YAML frontmatter (`name` + `description`)
- [ ] `/skills` lists all expected skills with correct descriptions
- [ ] Routing table covers every task type the agent will do
- [ ] AGENTS.md Out of Bounds matches what permissions-config.json enforces
- [ ] settings.json is valid JSON (no trailing commas, no `_comment` syntax errors)
- [ ] Any new extensions have been hot-reloaded and tested with `/reload`
- [ ] CONTEXT.md for each workspace reflects current project state
- [ ] MEMORY.md has no stale entries that would misinform the agent
- [ ] Annotation comments removed from all files before going live
