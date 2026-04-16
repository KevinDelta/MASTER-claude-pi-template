# BLUEPRINT — MASTER-claude-pi-template

The authoritative reference for how this system works. Read this before modifying anything structural.

---

## What This Is

A template for building project repos that a **pi.dev agent can fully inhabit** from a cold start. The premise: a well-structured repo IS the agent's brain. No external memory server, no database, no special infrastructure. The agent reads the files, understands the project, and knows how to work.

**Default agent:** [pi.dev](https://github.com/badlogic/pi-mono) — open-source, MIT, TypeScript, model-agnostic. ~200 token default system prompt. 4 core tools: read, write, edit, bash.

**Not** Inflection's Pi chatbot.

---

## Two Files Run Every Project

| File | What It Is | Who Reads It |
|------|-----------|--------------|
| `AGENTS.md` | Agent operating manual — routing, workspaces, rules | Pi reads at every session start |
| `.pi/settings.json` | Harness config — model, tools, memory path, extensions | Pi reads for operational settings |

Everything else (context files, CONTEXT.md, memory, skills) is content that AGENTS.md points to.

---

## Repo Structure

```
MASTER-claude-pi-template/
├── CLAUDE.md                  ← Human-facing guide for using this template
├── BLUEPRINT.md               ← This file — architectural reference
│
├── global/
│   └── AGENTS.md              ← Org-layer config; deploy to ~/.pi/agent/AGENTS.md once per machine
│
├── base/                      ← Copy this directory to start any new project
│   ├── AGENTS.md              ← Pi's primary config (TWO SECTIONS: global layer + project layer)
│   ├── SOUL.md                ← Persona / tone customization (optional — delete if not needed)
│   ├── .pi/
│   │   ├── settings.json      ← Model, tool permissions, compaction, extensions, skills paths
│   │   ├── SYSTEM.md          ← Replaces pi's system prompt entirely (power user only)
│   │   ├── APPEND_SYSTEM.md   ← Extends pi's system prompt (recommended for most projects)
│   │   ├── .env.example       ← Env var template for agentmemory bridge (copy → .pi/.env)
│   │   └── extensions/
│   │       ├── README.md      ← How extensions work, safety tiers, agentmemory setup
│   │       ├── permissions-config.json     ← Config for pi-permission-system (safety tier 2)
│   │       └── agentmemory-bridge.ts       ← Semantic memory bridge extension
│   ├── context/
│   │   ├── project.md         ← What the project is, scope, success criteria, current phase
│   │   ├── client.md          ← Who it's for, communication preferences, delivery standards
│   │   ├── stack.md           ← Tech stack, tools, infrastructure
│   │   └── decisions.md       ← Decisions already made (prevents relitigating)
│   ├── workspaces/
│   │   └── [workspace-name]/
│   │       └── CONTEXT.md     ← Current state: done / in-progress / queued / blocked
│   └── memory/
│       ├── MEMORY.md          ← Long-term knowledge (#tags + [[wiki-links]])
│       ├── SCRATCHPAD.md      ← Active checklist (open items auto-injected by pi-memory)
│       └── daily/             ← Append-only session logs (one file per day, YYYY-MM-DD.md)
│
└── skills/                    ← Universal skills; copy relevant ones per project
    ├── stop-slop.md           ← Strip AI writing patterns from human-facing prose
    ├── doc-authoring.md       ← Structure-first documentation methodology
    ├── context-update.md      ← End-of-session CONTEXT.md update protocol
    ├── memory-write.md        ← Write protocol: 3 destinations, auto-capture vs manual curation
    ├── memory-query.md        ← Retrieval: pi-memory BM25 + agentmemory semantic/graph tools
    ├── memory-architecture.md ← Two-layer memory reference: setup, search tool guide, diagnostics
    └── harness-dev.md         ← How to build and iterate on the harness itself
```

---

## The Two-Layer Architecture

`base/AGENTS.md` contains two clearly delineated sections in one file:

```
══ GLOBAL LAYER ══════════════════════════════════════
Deploy to: ~/.pi/agent/AGENTS.md
Applies to: every project on this machine

Org identity, org-wide standards, baseline tone.
Written once, inherited by every project automatically.

══ PROJECT LAYER ════════════════════════════════════
Lives in: [project-root]/AGENTS.md
Applies to: this project only

Project description, workspaces, routing table,
project-specific rules, out-of-bounds.
```

`global/AGENTS.md` is the standalone global template — deploy once, all projects inherit.

**Rule of thumb:** Same across all projects → global. Changes between projects → project layer. Never duplicate global rules in the project layer.

---

## Pi.dev Primitives

Pi natively reads and acts on exactly these files:

| File | Path | What Pi Does With It |
|------|------|---------------------|
| `AGENTS.md` | `[project-root]/AGENTS.md` | Loads hierarchically (global → project) at every session start; walks ancestor dirs |
| `.pi/APPEND_SYSTEM.md` | `[project-root]/.pi/APPEND_SYSTEM.md` | Appends content to pi's default ~200 token system prompt |
| `.pi/SYSTEM.md` | `[project-root]/.pi/SYSTEM.md` | Replaces pi's default system prompt entirely (power user only) |
| `SOUL.md` | `[project-root]/SOUL.md` | Not a pi primitive — a content file the agent reads when AGENTS.md routes to it |
| `.pi/settings.json` | `[project-root]/.pi/settings.json` | Configures model, tools, extensions, memory path, compaction |

Pi's 4 built-in tools (always available, no config): `read`, `write`, `edit`, `bash`

---

## The Routing Table

The most critical artifact in AGENTS.md. Every task type → workspace → files to read → skills to load. When a task arrives, the agent checks the table and starts from full context every time. Without it, the agent guesses.

```
| Task Type     | Workspace       | Read                                      | Load Skills                       |
|---------------|-----------------|-------------------------------------------|-----------------------------------|
| Session start | —               | memory/MEMORY.md                          | memory-query.md                   |
| Write content | /drafting       | context/project.md + drafting/CONTEXT.md  | stop-slop.md                      |
| Research      | /research       | context/client.md + research/CONTEXT.md   | —                                 |
| Session end   | —               | —                                         | memory-write.md + context-update.md |
```

If a task type isn't in the table, the agent guesses what context to load. Be exhaustive.

---

## Skills System

Skills are markdown files with YAML frontmatter that pi discovers and exposes to the agent:

```yaml
---
name: stop-slop
description: Strip AI writing patterns from prose. Load when writing or reviewing any human-facing text.
---
```

**Discovery:** Pi scans paths configured in `settings.json → skills.paths` at startup. Names and descriptions go into the system prompt. Agent reads the full skill file on demand when a task matches.

**Loading:** Explicit via routing table (preferred) or the agent self-selects based on the description in the system prompt.

**Naming rules:** 1–64 lowercase alphanumeric characters with hyphens. No leading/trailing/consecutive hyphens.

**Project skills live in:** `skills/` at project root (configured in `settings.json`). Copy from this repo's universal `skills/` folder — only copy what the project actually needs.

---

## Memory Architecture

The memory layer has two tiers. Layer 1 (pi-memory) is required and always active. Layer 2 (agentmemory) is optional and additive — it upgrades search without replacing anything.

### Layer 1 — Pi-memory (required)

**Extension:** [pi-memory](https://github.com/jayzeng/pi-memory) | **Install:** `pi install npm:pi-memory`

Pi-memory hooks `before_agent_start` and prepends keyword-relevant slices to the system prompt before every turn. 16K total budget. BM25 search.

**Three files:**

| File | Purpose | When to Write |
|------|---------|--------------|
| `memory/MEMORY.md` | Long-term, durable knowledge | Decisions, patterns, preferences, lessons — things true for the life of the project |
| `memory/SCRATCHPAD.md` | Active checklist | Open items to track across sessions; checked items excluded from injection |
| `memory/daily/YYYY-MM-DD.md` | Append-only session log | What was done, decided, and left open each session |

**Auto-injection priority (16K total):**
1. Open scratchpad items (2K)
2. Today's daily log tail (3K)
3. BM25 keyword search on current prompt (2.5K)
4. MEMORY.md long-term content (4K)
5. Yesterday's daily log (3K — trimmed first)

**Pull vs push:** Pi-memory auto-injects keyword-relevant slices (push). The routing table session-start row reads MEMORY.md directly for full orientation (pull). Both are needed.

---

### Layer 2 — Agentmemory (optional)

**Repo:** [github.com/rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) — runs as a background HTTP service (default: `localhost:3111`).

**What it adds over pi-memory:**

| Capability | pi-memory | agentmemory |
|------------|-----------|-------------|
| Keyword search (BM25) | ✓ | ✓ |
| Semantic / vector search | — | ✓ |
| Knowledge graph | — | ✓ |
| Pattern detection across sessions | — | ✓ |
| Auto-capture of tool call observations | — | ✓ |
| Memory tier consolidation | — | ✓ |
| Sync back to MEMORY.md (Claude Bridge) | — | ✓ |

**Bridge extension** (`base/.pi/extensions/agentmemory-bridge.ts`) connects automatically:
- `session_start` → health check; sets availability flag
- `before_agent_start` → semantic recall injected into system prompt prefix (adds to pi-memory's BM25 injection)
- `tool_call` → captures write/edit/bash as working memory observations
- `agent_end` → consolidates memory tiers; optionally syncs back to MEMORY.md via Claude Bridge

**Graceful degradation:** if agentmemory is unavailable, the bridge skips silently. Pi-memory continues uninterrupted.

**Configure:** copy `base/.pi/.env.example` → `.pi/.env`, set `AGENTMEMORY_PROJECT_ID` and optionally `CLAUDE_BRIDGE_SYNC=true`.

**What's gitignored:** `memory/.agentmemory/` (binary KV store, regenerable). `memory/MEMORY.md` is always committed — it remains the canonical record regardless of whether agentmemory is running.

For detailed setup, search tool selection, and diagnostics: load `memory-architecture.md` skill.

---

## Safety Architecture

Pi does **not** sandbox by default. Safety is opt-in via extensions. Three tiers:

| Tier | Extension | Mechanism | When to Use |
|------|-----------|-----------|-------------|
| 1 — Lightweight | pi-safety | Glob-based READ/WRITE classification | Default for most projects |
| 2 — Config-driven | pi-permission-system | Pattern rules in `permissions-config.json` | Stricter control, team use |
| 3 — AST-level | pi-safeguard v2 | Parses bash as AST, flags dangerous patterns | Production / high-stakes |

Install a safety extension for any project where bash access could cause damage. The `base/.pi/extensions/` directory contains the install instructions and a ready-to-use `permissions-config.json` for tier 2.

**AGENTS.md Out of Bounds** documents intent. The permission extension enforces it. Both are needed — AGENTS.md for agents running without the extension, the extension for actual enforcement.

---

## Extension System

Extensions are TypeScript files that hook into pi's event lifecycle. Auto-discovered from `.pi/extensions/*.ts`.

### Key Events

| Event | When It Fires | Common Use |
|-------|--------------|-----------|
| `before_agent_start` | Before every agent turn | Inject context, modify system prompt |
| `tool_call` | Before any tool executes | Block or log dangerous operations |
| `session_start` | Session load / reload | Initialize state, log session info |
| `session_compact` | Context compression triggered | Capture handoff state |
| `agent_end` | Agent loop completes | Post-turn logging, cleanup |

Install community extensions: `pi install git:github.com/user/repo` or `pi install npm:package`
Hot-reload during development: `/reload` in the pi session.

Full event reference: `github.com/badlogic/pi-mono/packages/coding-agent/docs/extensions.md`

---

## Session Flow (what the agent experiences)

1. Pi loads `~/.pi/agent/AGENTS.md` (global layer)
2. Pi loads `[project]/AGENTS.md` (project layer appends)
3. Pi loads `APPEND_SYSTEM.md` → added to system prompt
4. Pi loads `SOUL.md` if present
5. Pi reads `settings.json` → applies model, tool permissions, compaction config
6. Pi discovers skills from `skills.paths` → names/descriptions enter system prompt
7. Pi discovers extensions from `extensions.paths` → extensions register hooks
8. Pi-memory fires `before_agent_start` → injects 16K of relevant memory
9. Agent checks routing table → session-start row → reads `memory/MEMORY.md` directly
10. Agent fully oriented. Starts from context every time.

**Approximate context cost before first task:** 1,000–2,500 tokens (varies by MEMORY.md density and active scratchpad items).

---

## Setup: New Project

### One-time (per machine)

```bash
npm install -g @mariozechner/pi-coding-agent
pi install npm:pi-memory

# Global config
cp global/AGENTS.md ~/.pi/agent/AGENTS.md
# Fill in: org name, org-wide standards, tone, any global skills
```

### Per project

```bash
cp -r base/ ~/projects/my-project/
cd ~/projects/my-project/

# 1. Fill in AGENTS.md project layer:
#    - Project description (one concrete paragraph)
#    - Workspaces (rename example-workspace-* to actual work areas)
#    - Routing table (every task type the agent will handle)
#    - Project-specific rules and out-of-bounds

# 2. Fill in context/ files with real detail:
#    - project.md: what it is, scope, success criteria, current phase
#    - client.md: who it's for, communication preferences (delete if no client)
#    - stack.md: tech stack, tools, infrastructure
#    - decisions.md: decisions already made

# 3. Rename workspaces/ to actual work areas
#    Fill in each workspace/CONTEXT.md

# 4. Copy needed skills from skills/ into project's skills/
#    Only copy what the project will actually use

# 5. Review .pi/settings.json:
#    - Set model to match your provider/preference
#    - Adjust tool permissions if needed
#    - Confirm memory.dir is correct

# 6. Install safety extension (recommended):
#    pi install git:github.com/marcfargas/pi-safety        # tier 1
#    pi install git:github.com/MasuRii/pi-permission-system # tier 2

# 7. (Optional) Enable agentmemory for semantic memory:
#    git clone https://github.com/rohitg00/agentmemory && cd agentmemory
#    docker-compose up -d
#    cp .pi/.env.example .pi/.env
#    # Edit .pi/.env: set AGENTMEMORY_PROJECT_ID, CLAUDE_BRIDGE_SYNC

# 8. Delete all annotation comments from all files

pi  # run
```

---

## Authoring Quality is the Product

A vague `project.md` produces a vague agent. A specific, accurate `project.md` produces a specific, useful agent. The template is infrastructure; the content is what matters.

**Good project.md:** "A 6-week consulting engagement helping WynDelta (small food distribution co, 12 employees) map their supply chain processes and identify automation opportunities. Produces a prioritized action plan and an agent harness spec. Kevin owns all deliverables. Client reviews in-person weekly."

**Bad project.md:** "A client project to help with business operations."

The difference in agent output quality between these two is significant. Fill in the files with real detail. Generic content produces generic output.
