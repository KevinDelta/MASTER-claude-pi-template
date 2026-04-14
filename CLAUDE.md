# MASTER-claude-pi-template

> **Note:** This file is read by Claude Code as project instructions. The pi agent does not read this file — it reads `AGENTS.md`, `BLUEPRINT.md` (for harness work), and the skills/context files you point it to.

A template system for building project repos that a **pi.dev agent can fully inhabit**. The core idea: a well-structured repo IS the agent's brain. Drop a pi.dev agent into a properly built project and it knows what the project is, where to work, what skills to load, and how to behave — from the files alone.

**Default agent:** [pi.dev](https://github.com/badlogic/pi-mono) — open-source, MIT-licensed, model-agnostic coding agent.

**Authoritative technical reference:** `BLUEPRINT.md` — read this before making structural changes to the template.

---

## How to Use This Template

1. Copy the `base/` directory into your new project root
2. Fill in `AGENTS.md` — project layer: description, workspaces, routing table, rules
3. Fill in all `context/` files with real project information
4. Rename workspaces to match your project's actual work areas; fill in each `CONTEXT.md`
5. Copy relevant skills from `skills/` into your project's `skills/` folder
6. Configure `.pi/settings.json` — model, tool permissions, memory path
7. (Optional) Set up the agentmemory bridge for semantic memory — see `base/.pi/extensions/README.md`
8. Delete the annotation comments before going live

The quality of agent output is a direct function of how well these files are written. Generic content produces generic output.

---

## Repo Structure

```
global/                        ← Org-layer AGENTS.md — deploy to ~/.pi/agent/ once per machine

base/                          ← Copy this to start any new project
├── AGENTS.md                  ← Pi's primary config (two-layer: global + project sections)
├── APPEND_SYSTEM.md           ← Additive system prompt (recommended default)
├── SYSTEM.md                  ← Full system prompt replacement (power user only)
├── SOUL.md                    ← Persona/tone customization (optional — delete if not needed)
├── .gitignore                 ← Gitignores agentmemory binary store and .pi/.env
├── .pi/
│   ├── settings.json          ← Model, tool permissions, compaction, skills/extensions paths
│   ├── .env.example           ← Env template for agentmemory bridge (copy → .pi/.env)
│   └── extensions/
│       ├── README.md          ← How extensions work, safety tiers, agentmemory setup
│       ├── permissions-config.json      ← Config for pi-permission-system (safety tier 2)
│       └── agentmemory-bridge.ts        ← Semantic memory bridge extension
├── context/
│   ├── project.md             ← What the project is, scope, deliverables, current phase
│   ├── client.md              ← Who it's for, communication preferences (delete if no client)
│   ├── stack.md               ← Tech stack, tools, infrastructure
│   └── decisions.md           ← Decisions already made (prevents relitigating)
├── workspaces/
│   └── [workspace-name]/
│       └── CONTEXT.md         ← Purpose, Functions, Workflow, Standards, Current State
└── memory/
    ├── MEMORY.md              ← Long-term knowledge (#tags + [[wiki-links]])
    ├── SCRATCHPAD.md          ← Active checklist (open items auto-injected by pi-memory)
    └── daily/                 ← Append-only session logs

skills/                        ← Universal skills — copy what each project needs
├── stop-slop.md               ← Strip AI writing patterns from prose
├── doc-authoring.md           ← Structure-first documentation methodology
├── context-update.md          ← End-of-session CONTEXT.md update protocol
├── memory-write.md            ← Write protocol: 3 destinations, auto-capture vs manual
├── memory-query.md            ← Retrieval: pi-memory BM25 + agentmemory semantic/graph
├── memory-architecture.md     ← Two-layer memory reference: setup, search guide, diagnostics
└── harness-dev.md             ← How to build and iterate on the harness itself
```

---

## Working on This Repo with Claude Code

**To understand the system:** read `BLUEPRINT.md` first.

**To understand current project state and decisions:** read `PROJECT-CONTEXT.md`.

**Key files when making structural changes:**
- `base/AGENTS.md` — the agent's operating manual; changes here affect every project built from the template
- `base/.pi/settings.json` — harness config; json with `_comment` fields documenting each key
- `skills/*.md` — universal skills; each needs valid YAML frontmatter (`name` + `description`)
- `base/.pi/extensions/*.ts` — TypeScript extensions; use `ExtensionAPI` type, two-param handlers `(_event, ctx)`
- `BLUEPRINT.md` — keep in sync when structural decisions change

**What the pi agent reads vs what Claude Code reads:**

| File | Pi agent | Claude Code |
|------|----------|-------------|
| `AGENTS.md` | ✓ (primary config) | reference |
| `BLUEPRINT.md` | ✓ (harness-dev tasks) | ✓ (technical reference) |
| `CLAUDE.md` | — | ✓ (project instructions) |
| `PROJECT-CONTEXT.md` | — | ✓ (dev context) |
| `skills/*.md` | ✓ (via routing table) | reference |
| `.pi/settings.json` | ✓ (harness config) | reference |
