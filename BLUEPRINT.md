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
├── SPEC-v2.md                 ← v2 specification (domain layer, embedded DB, dock interface)
├── install.sh                 ← One-command installer for v2 domain setup
├── PI_DOCK.md                 ← Template: deploy to ~/.pi/PI_DOCK.md (host interface declaration)
│
├── global/
│   └── AGENTS.md              ← Global layer; deploy to ~/.pi/agent/AGENTS.md once per machine
│
├── domain/                    ← Domain template; deploy to ~/.pi/domain/<name>/ via install.sh
│   ├── AGENTS.md              ← Domain-layer config (vocabulary, methods, domain routing table)
│   ├── SOUL.md                ← Persona — REQUIRED at domain creation
│   ├── MEMORY.md              ← Human-readable domain memory index (decisions, patterns, lessons)
│   ├── watches.yaml           ← Proactivity declarations — cron schedules, tasks, goals
│   ├── context/
│   │   ├── domain.md          ← What the domain is, scope, active projects, constraints
│   │   └── clients.md         ← Cross-project client registry and comm standards
│   ├── skills/                ← Domain-level skills (auto-discovered)
│   │   ├── goals-resolver.md  ← Check goals against observations; propose recovery actions
│   │   └── domain-status.md   ← Cross-project status summary from domain memory
│   └── .pi/
│       ├── settings.json      ← Domain-level pi config (model, skills path, extensions path)
│       └── extensions/
│           ├── memory-db.ts   ← Embedded memory extension (SQLite + sqlite-vec, replaces HTTP bridge)
│           └── .env.example   ← Env template for memory-db (copy → .pi/.env)
│
├── base/                      ← Project template; copy to start any new project
│   ├── AGENTS.md              ← PROJECT LAYER ONLY (global + domain load before this)
│   ├── SOUL.md                ← Optional project-level persona override (delete if not needed)
│   ├── .pi/
│   │   ├── settings.json      ← Model, tool permissions, compaction, extensions, skills paths
│   │   ├── SYSTEM.md          ← Replaces pi's system prompt entirely (power user only)
│   │   ├── APPEND_SYSTEM.md   ← Extends pi's system prompt (recommended for most projects)
│   │   ├── .env.example       ← Env var template (copy → .pi/.env; set PI_PROJECT_ID here)
│   │   └── extensions/
│   │       ├── README.md      ← How extensions work, safety tiers, memory options (v1 + v2)
│   │       ├── permissions-config.json     ← Config for pi-permission-system (safety tier 2)
│   │       └── agentmemory-bridge.ts       ← v1 semantic bridge (kept for backwards compat)
│   ├── context/
│   │   ├── project.md         ← What the project is, scope, success criteria, current phase
│   │   ├── client.md          ← Who it's for, communication preferences, delivery standards
│   │   ├── stack.md           ← Tech stack, tools, infrastructure
│   │   └── decisions.md       ← Decisions already made (prevents relitigating)
│   ├── workspaces/
│   │   └── [workspace-name]/
│   │       └── CONTEXT.md     ← Current state: done / in-progress / queued / blocked
│   └── memory/                ← v1 project-level memory (used without domain layer)
│       ├── MEMORY.md          ← Long-term knowledge (#tags + [[wiki-links]])
│       ├── SCRATCHPAD.md      ← Active checklist (open items auto-injected by pi-memory)
│       └── daily/             ← Append-only session logs (one file per day, YYYY-MM-DD.md)
│
├── scheduler/                 ← OS scheduler templates for watches
│   ├── README.md              ← macOS + Linux scheduler setup and troubleshooting
│   ├── launchd/
│   │   └── com.pi.domain.watches.plist     ← macOS launchd template (installed by install.sh)
│   └── systemd/
│       ├── pi-domain-watches.service        ← Linux systemd service template
│       └── pi-domain-watches.timer          ← Linux systemd timer template
│
└── skills/                    ← Universal skills; copy relevant ones per project
    ├── stop-slop.md           ← Strip AI writing patterns from human-facing prose
    ├── doc-authoring.md       ← Structure-first documentation methodology
    ├── context-update.md      ← End-of-session CONTEXT.md update protocol
    ├── memory-write.md        ← Write protocol: 3 destinations, auto-capture vs manual curation
    ├── memory-query.md        ← Retrieval: pi-memory BM25 + domain DB semantic search
    ├── memory-db.md           ← v2 memory DB reference: schema, queries, setup, diagnostics
    ├── memory-architecture.md ← v1 two-layer memory reference (kept for v1 projects)
    ├── domain-bootstrap.md    ← Bootstrap new project context from domain memory
    └── harness-dev.md         ← How to build and iterate on the harness itself
```

---

## Three-Layer Architecture (v2)

Pi loads AGENTS.md hierarchically — three layers, each appending and overriding the one above:

| Layer | Location | Scope | Contents |
|-------|----------|-------|----------|
| **Global** | `~/.pi/agent/AGENTS.md` | Machine-wide | Org identity, baseline tone, universal standards |
| **Domain** | `~/.pi/domain/<name>/AGENTS.md` | All projects in one declared domain | Domain vocabulary, methods, routing table scaffold, domain-wide rules |
| **Project** | `<project-root>/AGENTS.md` | One engagement | Client, scope, workspaces, routing overrides, project-specific rules |

**Load order:** global → active domain → project

**Active domain:** declared in `~/.pi/active-domain` (plain text file, one line). Switch with `pi domain use <name>`.

**Composition rules:**
- Routing rows are matched by the Task Type column's first keyword
- A domain row overrides a global row with the same key
- A project row overrides a domain row with the same key
- Rows without a matching override at lower layers apply unchanged

**Rule of thumb:** Same across all projects → global. Changes between projects → project layer. Never duplicate global rules in the project layer.

**v1 → v2 migration note:** `base/AGENTS.md` is now project-layer only. The global layer block was removed. For projects not using the domain layer (v1-style), the global layer still loads from `~/.pi/agent/AGENTS.md` as before — no change to existing projects.

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

### Layer 2 — Domain Memory DB (v2, recommended)

`memory-db.ts` extension backed by SQLite + sqlite-vec. One file per domain at `~/.pi/domain/<name>/memory.db`. No HTTP service. No Docker. Full details in the **Embedded Memory DB** section below.

For setup, query reference, and diagnostics: load `memory-db.md` skill.

### Layer 2 — Agentmemory (v1, project-layer fallback)

**Repo:** [github.com/rohitg00/agentmemory](https://github.com/rohitg00/agentmemory) — runs as a background HTTP service (default: `localhost:3111`). Available for projects not using the v2 domain layer.

**Bridge extension** (`base/.pi/extensions/agentmemory-bridge.ts`):
- `session_start` → health check; sets availability flag
- `before_agent_start` → semantic recall injected into system prompt prefix
- `tool_call` → captures write/edit/bash as working memory observations
- `agent_end` → consolidates memory tiers; optionally syncs back to MEMORY.md

**Graceful degradation:** if agentmemory is unavailable, the bridge skips silently. Pi-memory continues uninterrupted.

**Configure:** copy `base/.pi/.env.example` → `.pi/.env`, set `AGENTMEMORY_PROJECT_ID` and optionally `CLAUDE_BRIDGE_SYNC=true`.

**What's gitignored:** `memory/.agentmemory/` (binary KV store, regenerable). `memory/MEMORY.md` is always committed — it remains the canonical record regardless of whether agentmemory is running.

For setup and search tool guide: load `memory-architecture.md` skill.

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

## Domain Template

The `domain/` directory is the v2 domain template. A worker copies it (via `install.sh`) to `~/.pi/domain/<domain-name>/` once per machine. It contains:

```
~/.pi/domain/<domain-name>/
├── AGENTS.md          ← Domain-layer agent config
├── SOUL.md            ← Persona — required at domain creation
├── MEMORY.md          ← Human-readable memory index (decisions, patterns, lessons)
├── memory.db          ← SQLite + sqlite-vec embedded DB (created on first session)
├── watches.yaml       ← Proactivity declarations (cron schedules, tasks, goals)
├── context/
│   ├── domain.md      ← What this domain is, scope, active projects
│   └── clients.md     ← Cross-project client registry
├── skills/            ← Domain-level skills (auto-discovered)
└── .pi/
    ├── settings.json  ← Domain-level pi config
    └── extensions/
        ├── memory-db.ts  ← Embedded memory extension
        └── .env          ← Env vars for memory-db (gitignored)
```

The active domain is declared in `~/.pi/active-domain` — a plain text file containing the domain name (one line). Pi reads this at startup to know which domain directory to load.

**Multi-domain:** v2 supports one active domain at a time. Switch with `pi domain use <name>`. Running two simultaneously is out-of-scope for v2; revisit when a worker's engagements genuinely span two distinct domains.

---

## Embedded Memory DB (v2)

The domain memory DB replaces the HTTP-based agentmemory service for the domain layer. One SQLite file at `~/.pi/domain/<name>/memory.db`. No daemon. No Docker.

### Schema overview

| Table | Purpose |
|-------|---------|
| `_meta` | Domain identity (name, created date, embedding model) — one row |
| `observations` | All session events: tool calls, decisions, notes, logs — tagged by project |
| `observations_vec` | Vector embeddings (768-dim, nomic-embed-text) for semantic search |
| `observations_fts` | FTS5 full-text index for keyword search |
| `scratchpad` | Active checklist items across projects |
| `goals` | Declared ideal states; referenced by watches for delta tracking |

### Extension hooks (`domain/.pi/extensions/memory-db.ts`)

| Hook | Behavior |
|------|----------|
| `session_start` | Open DB, initialize schema, log connection status |
| `before_agent_start` | FTS + vector search on current prompt; inject top N slices (16K budget); inject open scratchpad items |
| `tool_call` | Capture write/edit/bash calls as observation rows; skip read-only and memory tools |
| `agent_end` | Backfill embeddings for unembedded observations (up to 50 per session); optionally append session summary to MEMORY.md |

**Embedding model:** nomic-embed-text via local ollama (768 dimensions, MIT license, retrieval-tuned). Local by default. Workers who change this accept the privacy trade explicitly.

**Graceful degradation:** if DB is unavailable, all hooks return early. If ollama is unavailable, FTS recall still works — only vector recall is skipped.

**v1 project-layer memory:** `base/.pi/extensions/agentmemory-bridge.ts` remains for projects not using the domain layer. The two do not conflict — agentmemory-bridge handles project-layer memory, memory-db handles domain-layer memory.

---

## PI_DOCK.md — Host Interface

`PI_DOCK.md` (at `~/.pi/PI_DOCK.md`) declares what pi carries and what it exports to a host via MCP server mode. Template at repo root; deployed by `install.sh`.

**Three sections:**
- **Carried** — what pi brings to any host: domain, persona, active projects, memory DB location, skills
- **Export allowlist** — what pi surfaces to hosts (domain name, project names, skills descriptions, memory query answers); default deny on anything else
- **Host requirements** — what a host must provide: MCP endpoints, tool access, working directory

**MCP is the dock protocol.** When plugging into a host (Claude Desktop, Cursor, an employer's environment), pi runs: `pi serve --as-mcp`. The host connects to pi's MCP server and receives typed answers. The raw memory DB never leaves the worker's machine.

Workers update `PI_DOCK.md` when domain, skills, or active projects change.

---

## Watches and Scheduler (v2)

Proactivity lives at the domain layer. Declared in `~/.pi/domain/<name>/watches.yaml`.

### watches.yaml schema

```yaml
watches:
  - name: <unique-id>          # used as scheduler job label
    schedule: "<cron>"         # standard 5-field cron (min hour dom month dow)
    task: "<instruction>"      # passed to pi as --task; runs with full domain context
    output: notify             # notify | append MEMORY.md | silent
    condition: "<optional>"    # natural-language condition pi checks first
    goal: <goal-name>          # optional: triggers delta check against goals table
```

### How watches fire

A single launchd job (macOS) or systemd timer (Linux) fires `pi` once per minute. Pi reads `watches.yaml`, evaluates which cron entries match the current time, runs only matching watches, and exits. No daemon — the OS manages scheduling reliability.

Watches update automatically: edit `watches.yaml`, the next scheduler run picks up changes. No reload needed.

Scheduler templates: `scheduler/launchd/` (macOS) and `scheduler/systemd/` (Linux). Installed by `install.sh`.

---

## Session Flow (v2)

1. Pi reads `~/.pi/active-domain` → identifies active domain directory
2. Pi loads `~/.pi/agent/AGENTS.md` (global layer)
3. Pi loads `~/.pi/domain/<name>/AGENTS.md` (domain layer appends/overrides)
4. Pi loads `[project]/AGENTS.md` (project layer appends/overrides)
5. Pi loads `APPEND_SYSTEM.md` → added to system prompt
6. Pi loads `SOUL.md` (domain layer — required; project layer — optional override)
7. Pi reads domain `settings.json` + project `settings.json` (project overrides domain)
8. Pi discovers skills from domain `skills/` + project `skills/` → names/descriptions in system prompt
9. Pi discovers extensions → `memory-db.ts` registers hooks
10. `memory-db.ts` fires `before_agent_start` → FTS + vector recall injected (16K budget) + open scratchpad
11. Agent checks routing table → session-start row → reads domain MEMORY.md for full orientation
12. Agent fully oriented. Starts from context every time.

**Approximate context cost before first task:** 1,500–3,500 tokens (varies by domain MEMORY.md density, open scratchpad items, and active project count).

---

## Setup: New Domain + Project (v2)

### One-time per machine (v2)

```bash
# Install prerequisites
npm install -g @mariozechner/pi-coding-agent
npm install -g better-sqlite3 sqlite-vec
pi install npm:pi-memory
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull nomic-embed-text

# Deploy domain from this template
./install.sh --domain <domain-name> --persona <persona-name>

# After install: source your shell RC to activate the persona alias
source ~/.zshrc  # or ~/.bashrc
```

### Per project (v2)

```bash
cp -r base/ ~/projects/my-project/
cd ~/projects/my-project/

# 1. Set project ID in .pi/.env (required for domain memory tagging):
echo "PI_PROJECT_ID=my-project-slug" >> .pi/.env

# 2. Fill in AGENTS.md project layer:
#    - Project description (one concrete paragraph)
#    - Workspaces (rename example-workspace-* to actual work areas)
#    - Routing table (every task type the agent will handle)
#    - Project-specific rules and out-of-bounds

# 3. Fill in context/ files with real detail:
#    - project.md: what it is, scope, success criteria, current phase
#    - client.md: who it's for, communication preferences
#    - decisions.md: decisions already made

# 4. (Optional) Bootstrap context from domain memory:
#    Start a pi session and load domain-bootstrap skill

# 5. Copy needed skills from skills/ into project's skills/

# 6. Install safety extension (recommended):
#    pi install git:github.com/marcfargas/pi-safety        # tier 1
#    pi install git:github.com/MasuRii/pi-permission-system # tier 2

# 7. Register project in domain context:
#    Add to ~/.pi/domain/<name>/context/domain.md under Active Projects

# 8. Delete all annotation comments from all files

<persona-name>  # run via alias, or: PI_DOMAIN_NAME=<domain-name> pi
```

### One-time per machine (v1 — without domain layer)

```bash
npm install -g @mariozechner/pi-coding-agent
pi install npm:pi-memory

cp global/AGENTS.md ~/.pi/agent/AGENTS.md
# Fill in: org name, org-wide standards, tone
```

Then follow the per-project steps above, skipping step 1 (PI_PROJECT_ID not required without domain memory).

---

## Authoring Quality is the Product

A vague `project.md` produces a vague agent. A specific, accurate `project.md` produces a specific, useful agent. The template is infrastructure; the content is what matters.

**Good project.md:** "A 6-week consulting engagement helping WynDelta (small food distribution co, 12 employees) map their supply chain processes and identify automation opportunities. Produces a prioritized action plan and an agent harness spec. Kevin owns all deliverables. Client reviews in-person weekly."

**Bad project.md:** "A client project to help with business operations."

The difference in agent output quality between these two is significant. Fill in the files with real detail. Generic content produces generic output.
