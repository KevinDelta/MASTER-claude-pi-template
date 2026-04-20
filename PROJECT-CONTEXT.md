# MASTER-claude-pi-template — Project Context

> **Note:** This file is dev context for Claude Code sessions working on this template repo. The pi agent does not read this file. For technical reference, read `BLUEPRINT.md`. For Claude Code project instructions, read `CLAUDE.md`.

---

## What We Built (Changelog)

### Phase 4 — Harness Enhancements from Team Review (2026-04-19)

Triaged 23 items from a team review of v2 capabilities. Implemented 8; deferred 2 to v3; skipped the rest as out of scope for the template layer.

**Batch 1 — Settings + Docs (#3, #4, #13):**
- `base/.pi/settings.json` — `"enableSkillCommands": true` added; skills now invocable as `/skill:name` without a routing table match
- Both `base/workspaces/*/CONTEXT.md` templates — new `## Session Navigation` section covering `/tree`, `Shift+L` branch labels, and when to promote work to Current State
- `base/.pi/.env.example` — `PI_WORKSPACE` and `PI_PHASE` documented as per-project env vars with usage notes
- `domain/.pi/extensions/.env.example` — reference block added explaining these vars are set per project, not at domain level

**Batch 2 — memory-db.ts (#14, #16, #23):**
- `session_compact` hook (#14): before context compression, snapshots open scratchpad items, active goals, and last 3 decisions into a `compact_summary` observation row — survives compaction, re-injected on next turn
- `deferred_tasks` table (#16): new schema table; `before_agent_start` injects tasks with `due_date <= today` tagged `[deferred]`; `agent_end` SYNC_MD line now includes pending deferred task count
- `tool_call_error` hook (#23): captures tool failures as `error` observation rows with tool, error message, workspace, and phase tagged
- `tool_call` observations now tag `workspace` and `phase` from env vars
- `WORKSPACE` and `PHASE` consts added from `PI_WORKSPACE`/`PI_PHASE` env vars
- `insertObservation` type signature extended: `compact_summary` and `error` added as valid kinds
- Schema: `kind` CHECK extended; `deferred_tasks` table added

**Batch 3 — Watches + Permissions (#5, #11):**
- `domain/watches.yaml` — `format` field added to schema (json | text); two commented-out JSON-mode example watches (`weekly-metrics`, `daily-error-digest`) demonstrate structured output contracts
- `scheduler/README.md` — new "JSON Mode Watches" section: when to use it, how results land in memory.db, sqlite3 parse pattern
- `base/.pi/extensions/permissions-config.json` — write and edit blocks extended: `*/workspaces/*` and `*/context/*` → allow; `*/memory.db` and `*/node_modules/*` → deny; ordering comment added explaining last-wins semantics

**V3 deferred:** #10 (model switching hooks), #15 (RPC mode for watches)

**Docs updated:** `skills/memory-db.md`, `skills/memory-architecture.md` (schema block was stale v1 — replaced with actual v2 schema), `SPEC-v2.md` (schema + hooks table), `PROJECT-CONTEXT.md`

---

### Phase 3 — SPEC-v2 Domain Layer (2026-04-18)

**Domain template (`domain/`) created:**
Full domain layer template deployed to `~/.pi/domain/<name>/` via `install.sh`. Contains:
- `AGENTS.md` — domain-layer config (vocabulary, methods, routing table scaffold)
- `SOUL.md` — persona template (REQUIRED at domain creation — not optional)
- `MEMORY.md` — human-readable domain memory index (decisions, patterns, lessons)
- `watches.yaml` — proactivity declarations (cron schedules, tasks, optional goals)
- `context/domain.md` — what the domain is, scope, active projects, constraints
- `context/clients.md` — cross-project client registry and comm standards
- `skills/goals-resolver.md` — check goals against observations, propose recovery
- `skills/domain-status.md` — cross-project status summary from domain memory
- `.pi/settings.json` — domain-level pi config (model, skills path, extensions path)
- `.pi/extensions/memory-db.ts` — embedded memory extension (SQLite + sqlite-vec)
- `.pi/extensions/.env.example` — env template for memory-db

**memory-db.ts extension:**
TypeScript extension backed by SQLite + sqlite-vec. Replaces the HTTP-based agentmemory service for the domain layer. No daemon. No Docker. One file per domain.
- `session_start` — open DB, initialize schema, log status
- `before_agent_start` — FTS + vector search on prompt; inject top N slices (16K budget); inject open scratchpad items
- `tool_call` — capture write/edit/bash calls as observation rows
- `agent_end` — backfill embeddings (nomic-embed-text via ollama); optionally append session summary to MEMORY.md
- Graceful degradation: DB unavailable → all hooks return early; ollama unavailable → FTS still works

**PI_DOCK.md template:**
Host interface declaration at repo root; deploys to `~/.pi/PI_DOCK.md`. Declares what pi carries (domain, persona, active projects, memory DB, skills), export allowlist (default deny on anything not listed), and host requirements (MCP endpoints, permissions, network, workspace). MCP is the dock protocol.

**Scheduler templates:**
- `scheduler/launchd/com.pi.domain.watches.plist` — macOS launchd template
- `scheduler/systemd/pi-domain-watches.service` — Linux systemd service
- `scheduler/systemd/pi-domain-watches.timer` — Linux systemd timer (fires every minute)
- `scheduler/README.md` — setup, management, troubleshooting

**New skills:**
- `skills/domain-bootstrap.md` — bootstrap new project context files from domain memory; prevents blank-template starts
- `skills/memory-db.md` — v2 memory DB reference (schema, queries, setup, diagnostics)
- `domain/skills/goals-resolver.md` — domain skill for goal delta checking
- `domain/skills/domain-status.md` — domain skill for cross-project status

**install.sh:**
One-command installer. Takes `--domain <name>` and `--persona <name>`. Handles: prereq checks, directory creation, template deployment, placeholder substitution, .env creation, active-domain pointer file, nomic-embed-text pull, persona CLI alias, OS scheduler setup (macOS launchd or Linux systemd). Flags: `--skip-ollama`, `--skip-scheduler`, `--yes`, `--dry-run`.

**Modified files:**
- `base/AGENTS.md` — stripped to project-layer only (global section removed; now loads after global+domain)
- `global/AGENTS.md` — added three-layer load order documentation in header comment
- `base/.pi/extensions/README.md` — updated memory section to lead with memory-db.ts (v2); kept agentmemory-bridge docs as v1 fallback
- `BLUEPRINT.md` — major update: three-layer architecture, domain template, embedded DB, PI_DOCK, watches, scheduler, updated session flow, updated setup instructions

---

### Phase 1 — Harness Foundation (2026-04-11 / 2026-04-14)

**Skills system fixed:**
All 5 universal skills had YAML frontmatter added (`name` + `description`). Without it, pi couldn't auto-discover them. Skills now load correctly via the routing table.

**Settings.json rewritten:**
`base/.pi/settings.json` now covers the full pi config surface: model, `defaultThinkingLevel` (string, not object), tool permissions, compaction, skills paths, extensions paths, memory dir, retry config. All keys documented with adjacent `_comment` fields.

**Safety infrastructure added:**
`base/.pi/extensions/` created with README (three-tier safety ladder + agentmemory docs) and `permissions-config.json` template for pi-permission-system (tier 2). AGENTS.md Out of Bounds section updated to reference the config file.

**AGENTS.md routing table expanded:**
From 3 anonymous placeholder rows to 13 typed rows covering the full range of real project work. Includes adaptation guide for content/consulting/software projects.

**BLUEPRINT.md created:**
Authoritative technical reference at repo root. Covers two-file architecture, all primitives, routing table, skills system, two-layer memory, safety tiers, extension events, session flow, setup instructions.

**harness-dev.md skill created:**
Dev flow skill loaded for harness-dev tasks: how to add skills, modify routing table, update settings, write extensions, debug unexpected behavior.

**CONTEXT.md templates updated:**
Both workspace templates rewritten with five stable sections (Purpose, Functions, Workflow, Standards, Skills Active) and one volatile section (Current State). Functions and Workflow sections tell the agent the action vocabulary and sequence for work in that workspace.

**Global pi settings:**
`~/.pi/agent/settings.json` updated with `doubleEscapeAction: "fork"` for session branching on double-escape.

---

### Phase 2 — Memory Upgrade (2026-04-14)

**Agentmemory bridge extension added:**
`base/.pi/extensions/agentmemory-bridge.ts` — TypeScript extension connecting to agentmemory HTTP service. Implements health check (session_start), semantic recall injection (before_agent_start), observation capture (tool_call), and memory consolidation + Claude Bridge sync (agent_end). Full graceful degradation if service is unavailable.

**Infrastructure files added:**

- `base/.gitignore` — gitignores `memory/.agentmemory/` (binary), `.pi/.env` (secrets)
- `base/.pi/.env.example` — env template with all 5 bridge vars documented
- `base/.pi/settings.json` — added `env._file` block pointing to `.pi/.env`

**Memory skills updated:**

- `skills/memory-write.md` — added Auto-Capture vs Manual Curation section (auto handles episodic; manual handles decisions/lessons/preferences)
- `skills/memory-query.md` — added Agentmemory Search section with `memory_smart_search`, `memory_recall`, `memory_patterns`, `memory_graph_query` and when to use each

**New skill — memory-architecture.md:**
Complete reference for the two-layer memory system: Layer 1 (pi-memory markdown), Layer 2 (agentmemory binary), Claude Bridge, setup, search tool guide, diagnostic checklist.

**BLUEPRINT.md updated:**
Memory Architecture section now describes two-layer system. Repo structure block includes new files. Setup instructions include optional agentmemory step.

**Root docs consolidated:**
CLAUDE.md trimmed to entry-point only (how to use template, repo structure, who-reads-what table). PROJECT-CONTEXT.md (this file) stripped of reference content — BLUEPRINT.md owns that.

---

## Key Design Decisions

| Decision | What | Why |
| ---------- | ------ | ----- |
| YAML frontmatter required on skills | `name` + `description` fields | Pi can't discover or describe skills without them |
| `defaultThinkingLevel` is a string | `"medium"` not `{ "level": "medium" }` | Pi's actual type; object caused silent parse failure |
| `skills`/`extensions` are arrays | `["skills/*.md"]` not `{ "paths": [...] }` | Same issue — real pi schema takes flat arrays |
| ExtensionAPI two-param handlers | `async (_event, ctx) =>` | Pi's real signature; one-param would receive event, not ctx |
| agentmemory interaction via HTTP only | Never touch iii-sdk directly | iii-sdk is proprietary Anthropic infrastructure; MCP/HTTP is the stable interface |
| Binary store is gitignored | `memory/.agentmemory/` excluded | Regenerable from observations; MEMORY.md is the canonical committed record |
| Bridge checks health before acting | `available` flag gated | Ensures pi-memory continues uninterrupted if agentmemory is down |
| CONTEXT.md has Functions + Workflow | Stable process sections added | Gives the agent action vocabulary and sequencing without duplicating routing tables |
| No routing tables in CONTEXT.md | Decision: not added | Wrong time horizon — routing is architecture, CONTEXT.md is volatile state |
| Global/project in one AGENTS.md | Both sections, clear delineation | Full picture in one template file; split for deploy |
| Custom skills always | Write our own, draw from community for conventions | Skills must match org-specific standards and vocabulary |

---

## What We Learned

**Pi's schema is unforgiving silently.** Wrong types for `defaultThinkingLevel` (object vs string) and `skills` (object vs array) fail without error messages — the config just doesn't apply. Always verify against actual pi source.

**The routing table IS the session discipline.** Without it, agents guess what to load. With it, every session starts from identical complete context.

**Context files and memory serve different time horizons.** `context/` = stable project facts. `workspaces/CONTEXT.md` = current work state. `memory/` = accumulated knowledge. None substitutes for another.

**Auto-capture reduces manual overhead significantly.** When the agentmemory bridge captures tool call observations automatically, the session-end memory-write task shrinks to decisions/lessons only — not a full narrative log.

**Global/project separation is load-bearing.** Without it, org standards drift into individual projects and diverge. Update once, every project inherits.

**Authoring quality is the actual product.** The template is infrastructure. Specific, accurate content files produce specific, useful agents.

---

## Current State

**Phase 1 (Harness Foundation):** Complete.

**Phase 2 (Memory Upgrade):** Complete — agentmemory bridge shipped.

**Phase 3 (SPEC-v2 Domain Layer):** Complete. All five phases shipped.

**Open items / what's next:**

- End-to-end test: run `./install.sh --domain test --persona test-agent --dry-run`, then full install, verify memory-db extension connects and DB is created on first session
- Context files (`project.md`, `client.md`, etc.) need worked examples showing what "specific enough" looks like
- The `global/AGENTS.md` template could be more opinionated about org-wide routing patterns
- Domain-specific skills (research, writing, code, ops) could be added to the universal skills library
- End-to-end test: stand up an actual pi project from `base/`, run through session start → task → session end, verify memory injection and routing table work correctly
- Multi-device setup docs: iCloud Drive sync (macOS primary) and syncthing (cross-platform) documented in BLUEPRINT.md under domain portability
- LanceDB migration path: document the Phase 2 (sqlite-vec → LanceDB) migration steps when multi-device write conflicts become a real constraint
- Phase 0 (upstream): contribute `--as-mcp` mode to pi.dev — unlocks PI_DOCK.md host plug-in model; currently PI_DOCK.md is a declaration without enforcement
- v3 natural-language authoring layer: let a knowledge worker configure their domain without editing files directly — v3 work, not v2
