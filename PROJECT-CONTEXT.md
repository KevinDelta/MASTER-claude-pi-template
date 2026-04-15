# MASTER-claude-pi-template — Project Context

> **Note:** This file is dev context for Claude Code sessions working on this template repo. The pi agent does not read this file. For technical reference, read `BLUEPRINT.md`. For Claude Code project instructions, read `CLAUDE.md`.

---

## What We Built (Changelog)

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

**Phase 1:** Complete.

**Phase 2:** Complete.

**Open items / what's next:**

- Context files (`project.md`, `client.md`, etc.) need worked examples showing what "specific enough" looks like
- The `global/AGENTS.md` template could be more opinionated about org-wide routing patterns
- Domain-specific skills (research, writing, code, ops) could be added to the universal skills library
- End-to-end test: stand up an actual pi project from `base/`, run through session start → task → session end, verify memory injection and routing table work correctly
