# MASTER-claude-pi-template

> **Note:** This file is read by Claude Code as project instructions. The pi agent does not read this file — it reads `AGENTS.md`, `BLUEPRINT.md` (for harness work), and the skills/context files you point it to.

A template system for building portable, domain-scoped knowledge worker agents. The core idea: a well-structured set of files IS the agent's brain. The knowledge worker carries their domain context, memory, and persona between projects and host environments.

**Default agent harness:** [pi.dev](https://github.com/badlogic/pi-mono) — open-source, MIT-licensed, model-agnostic. Pi.dev is the reference implementation. The file layout, DB schema, PI_DOCK contract, and watches.yaml schema define the durable spec.

**Authoritative technical reference:** `BLUEPRINT.md` — read this before making structural changes.

**Current spec:** `SPEC-v2.md` — domain layer, embedded memory DB, dock interface, proactivity.

---

## How to Use This Template

1. Run `./install.sh --domain <name> --persona <persona-name>`
2. Fill in `~/.pi/domain/<name>/AGENTS.md` — domain vocabulary, methods, routing scaffold
3. Fill in `~/.pi/domain/<name>/SOUL.md` — persona voice, identity, relationship to worker
4. Fill in `~/.pi/domain/<name>/context/domain.md` — what the domain is, active projects
5. Fill in `~/.pi/PI_DOCK.md` — carried items and host requirements
6. Copy `base/` into each new project root; set `PI_PROJECT_ID` in `.pi/.env`
7. Fill in project `AGENTS.md`, `context/` files, and `workspaces/`
8. Delete annotation comments before going live

The quality of agent output is a direct function of how well these files are written. Generic content produces generic output.

---

## Repo Structure

```
MASTER-claude-pi-template/
├── CLAUDE.md              ← This file — Claude Code project instructions
├── BLUEPRINT.md           ← Authoritative technical reference (v1 + v2)
├── SPEC-v2.md             ← v2 specification: domain layer, embedded DB, dock, proactivity
├── PROJECT-CONTEXT.md     ← Dev changelog and current state (Claude Code only)
├── install.sh             ← One-command v2 installer (--domain, --persona)
├── PI_DOCK.md             ← Template: deploy to ~/.pi/PI_DOCK.md (host interface)
│
├── global/
│   └── AGENTS.md          ← Global layer; deploy to ~/.pi/agent/AGENTS.md once per machine
│
├── domain/                ← Domain template; deploy to ~/.pi/domain/<name>/ via install.sh
│   ├── AGENTS.md          ← Domain-layer config (vocabulary, methods, routing scaffold)
│   ├── SOUL.md            ← Persona — REQUIRED at domain creation
│   ├── MEMORY.md          ← Human-readable domain memory index
│   ├── watches.yaml       ← Proactivity declarations (cron, tasks, goals)
│   ├── context/
│   │   ├── domain.md      ← What the domain is, scope, active projects
│   │   └── clients.md     ← Cross-project client registry
│   ├── skills/
│   │   ├── goals-resolver.md  ← Check goals against observations; propose recovery
│   │   └── domain-status.md   ← Cross-project status summary
│   └── .pi/
│       ├── settings.json  ← Domain-level pi config
│       └── extensions/
│           ├── memory-db.ts   ← Embedded memory extension (SQLite + sqlite-vec)
│           └── .env.example   ← Env template for memory-db
│
├── base/                  ← Project template; copy to start any new project
│   ├── AGENTS.md          ← PROJECT LAYER ONLY (global + domain load before this)
│   ├── SOUL.md            ← Optional project-level persona override
│   ├── .pi/
│   │   ├── settings.json  ← Project-level pi config (overrides domain defaults)
│   │   ├── APPEND_SYSTEM.md   ← Additive system prompt
│   │   ├── SYSTEM.md          ← Full system prompt replacement (power user)
│   │   ├── .env.example       ← Env template (set PI_PROJECT_ID here)
│   │   └── extensions/
│   │       ├── README.md              ← Extensions reference
│   │       └── permissions-config.json ← Safety tier 2 config
│   ├── context/
│   │   ├── project.md     ← What the project is, scope, deliverables, current phase
│   │   ├── client.md      ← Who it's for, communication preferences
│   │   ├── stack.md       ← Tech stack, tools, infrastructure
│   │   └── decisions.md   ← Decisions already made
│   ├── workspaces/
│   │   └── [workspace-name]/
│   │       └── CONTEXT.md ← Purpose, workflow, current state
│
├── scheduler/             ← OS scheduler templates for watches
│   ├── README.md
│   ├── launchd/
│   │   └── com.pi.domain.watches.plist  ← macOS template (installed by install.sh)
│   └── systemd/
│       ├── pi-domain-watches.service    ← Linux systemd service
│       └── pi-domain-watches.timer      ← Linux systemd timer
│
└── skills/                ← Universal skills; copy relevant ones per project
    ├── stop-slop.md           ← Strip AI writing patterns from prose
    ├── doc-authoring.md       ← Structure-first documentation methodology
    ├── context-update.md      ← End-of-session CONTEXT.md update protocol
    ├── memory-write.md        ← Write protocol: auto-capture vs manual curation
    ├── memory-query.md        ← Retrieval: domain DB semantic + FTS search
    ├── memory-db.md           ← Memory DB reference: schema, queries, diagnostics
    ├── memory-architecture.md ← Domain memory architecture reference
    ├── domain-bootstrap.md    ← Bootstrap new project context from domain memory
    └── harness-dev.md         ← How to build and iterate on the harness itself
```

---

## Working on This Repo with Claude Code

**To understand the system:** read `BLUEPRINT.md` first.

**To understand current project state and open items:** read `PROJECT-CONTEXT.md`.

**Key files when making structural changes:**

| File | What it controls |
|------|-----------------|
| `domain/AGENTS.md` | Domain-layer template; changes affect every domain built from this repo |
| `domain/.pi/extensions/memory-db.ts` | Embedded memory extension; core v2 infrastructure |
| `domain/watches.yaml` | Proactivity template; watch schema |
| `base/AGENTS.md` | Project-layer template; changes affect every project |
| `base/.pi/settings.json` | Project-level harness config |
| `skills/*.md` | Universal skills; each needs YAML frontmatter (`name` + `description`) |
| `install.sh` | One-command installer; handles all deployment and placeholder substitution |
| `BLUEPRINT.md` | Keep in sync when structural decisions change |
| `SPEC-v2.md` | v2 design spec; update when architectural decisions change |

**What the pi agent reads vs what Claude Code reads:**

| File | Pi agent | Claude Code |
|------|----------|-------------|
| `global/AGENTS.md` | ✓ (global layer) | reference |
| `domain/AGENTS.md` | ✓ (domain layer) | reference |
| `base/AGENTS.md` (project copy) | ✓ (project layer) | reference |
| `BLUEPRINT.md` | ✓ (harness-dev tasks) | ✓ (technical reference) |
| `SPEC-v2.md` | — | ✓ (v2 design spec) |
| `CLAUDE.md` | — | ✓ (project instructions) |
| `PROJECT-CONTEXT.md` | — | ✓ (dev context) |
| `CLIENT-ONBOARDING-RUNBOOK.md` | — | ✓ (onboarding ops, gitignored) |
| `skills/*.md` | ✓ (via routing table) | reference |
| `domain/.pi/settings.json` | ✓ (domain harness config) | reference |
| `base/.pi/settings.json` | ✓ (project harness config) | reference |
