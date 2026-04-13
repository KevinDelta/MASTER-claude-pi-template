# MASTER-claude-pi-template — Project Context

## What This Is

A template system for building project repos that a **pi.dev agent can fully inhabit**. The goal: capture an org's workflows, processes, and accumulated knowledge in structured files so the agent has a complete, living environment to work in — and enrich over time.

**Core premise:** A well-structured repo IS the agent's brain. The agent reads the files, understands the project, and knows how to work. No external memory, no database, no special infrastructure.

**Default agent:** [pi.dev](https://github.com/badlogic/pi-mono) — open-source, MIT, TypeScript, model-agnostic coding agent (~200 token system prompt, 4 core tools: read/write/edit/bash).

---

## What We Built

### Repo Structure (current, production-ready)

```
MASTER-claude-pi-template/
├── CLAUDE.md                  ← master guide for this template repo
├── BLUEPRINT.md               ← detailed reference doc (file-by-file, setup, session flow)
│
├── global/
│   └── AGENTS.md              ← org-layer config; deploy to ~/.pi/agent/AGENTS.md once
│
├── base/                      ← copy this directory to start any new project
│   ├── AGENTS.md              ← pi's primary config (contains BOTH global + project layers)
│   ├── APPEND_SYSTEM.md       ← extends pi's system prompt (recommended for most projects)
│   ├── SYSTEM.md              ← replaces pi's system prompt entirely (power user only)
│   ├── SOUL.md                ← persona/tone customization (optional)
│   ├── .pi/
│   │   └── settings.json      ← model, tool permissions, memory path, compaction
│   ├── context/
│   │   ├── project.md         ← what the project is, scope, deliverables
│   │   ├── client.md          ← who it's for, preferences, communication style
│   │   ├── stack.md           ← tech stack, tools, infrastructure
│   │   └── decisions.md       ← decisions already made (prevents relitigating)
│   ├── workspaces/
│   │   └── [workspace-name]/
│   │       └── CONTEXT.md     ← current state: done/in-progress/queued/blocked
│   └── memory/
│       ├── MEMORY.md          ← long-term knowledge (#tags + [[wiki-links]])
│       ├── SCRATCHPAD.md      ← active checklist (open items auto-injected)
│       └── daily/             ← append-only session logs (one file per day)
│
└── skills/                    ← universal skills; copy relevant ones per project
    ├── stop-slop.md           ← strips AI writing patterns from prose
    ├── doc-authoring.md       ← structure-first documentation methodology
    ├── context-update.md      ← end-of-session CONTEXT.md protocol
    ├── memory-write.md        ← pi-memory write protocol (3 destinations, tag vocab)
    └── memory-query.md        ← pi-memory retrieval + auto-injection awareness
```

---

## How Pi.dev Works (the foundation everything builds on)

**Hierarchical loading:** Pi composes AGENTS.md files from `~/.pi/agent/` → parent dirs → cwd. Global rules compose with project rules automatically.

**Pi's native config files** (all in `base/`):

| File | Pi does what with it |
|------|---------------------|
| `AGENTS.md` | Reads hierarchically at every session start — primary config |
| `APPEND_SYSTEM.md` | Prepends to pi's ~200 token default system prompt |
| `SYSTEM.md` | Replaces pi's default system prompt entirely |
| `SOUL.md` | Applies persona/tone customization |
| `.pi/settings.json` | Project-level override for model, tools, compaction, memory path |

**Pi's 4 built-in tools** (always available, no config): `read`, `write`, `edit`, `bash`

**Skills system:** First-class in pi. Load markdown files on demand via routing table. Agent has exactly the skills the table loads — nothing ambient.

---

## The Two-Layer Architecture

`base/AGENTS.md` contains both layers in one file with clear visual delineation:

```
══ GLOBAL LAYER ══
(deploy to ~/.pi/agent/AGENTS.md — applies to ALL projects)
- Org identity, universal standards, tone baseline

══ PROJECT LAYER ══
(stays in project root — this project only)
- Project description, workspaces, routing table, project-specific rules, out-of-bounds
```

`global/AGENTS.md` is the standalone global template — install once, all projects inherit.

**Rule of thumb:** Same across all projects → global. Changes per project → project layer. Never duplicate global rules in the project layer.

---

## The Routing Table

The most critical artifact in the whole system. Lives in AGENTS.md. Maps every task type → workspace → files to read → skills to load. When a task arrives, the agent checks the table and starts from full context every time.

```
| Task Type     | Workspace | Read                                     | Load Skills                    |
|---------------|-----------|------------------------------------------|-------------------------------|
| Session start | —         | memory/MEMORY.md                         | memory-query.md               |
| Write content | /drafting | context/project.md + drafting/CONTEXT.md | stop-slop.md                  |
| Research      | /research | context/client.md + research/CONTEXT.md  | —                             |
| Session end   | —         | —                                        | memory-write.md + context-update.md |
```

---

## Memory Layer (pi-memory — default, not optional)

**Extension:** [github.com/jayzeng/pi-memory](https://github.com/jayzeng/pi-memory)
**Install:** `pi install npm:pi-memory`

**How it works:** Hooks into `before_agent_start`, prepends relevant memory to system prompt before every turn. 16K budget. BM25 keyword search. No manual action required.

**Injection priority (16K total):**
1. SCRATCHPAD.md open items (2K)
2. Today's daily log tail (3K)
3. BM25 search results on current prompt (2.5K)
4. MEMORY.md long-term content (4K)
5. Yesterday's daily log (3K — trimmed first)

**Three files:**

`MEMORY.md` — long-term, durable facts. Uses `#tags` and `[[wiki-links]]`.
```
#decision [[database]] Chose PostgreSQL. Evaluated MySQL — weaker JSON support.
#preference [[deliverables]] All outputs to Google Drive. Never send raw .md files.
#lesson [[client-comms]] Client wants open questions numbered at top, not inline.
```
Tags: `#decision` `#pattern` `#preference` `#lesson` `#bug`

`SCRATCHPAD.md` — active checklist. Checked items excluded from injection automatically.
```
- [ ] [2026-04-10] Follow up on Section 4 draft review
- [x] Finalize section headers
```

`daily/YYYY-MM-DD.md` — append-only session logs. Auto-created on compaction; write manually for explicit closure.

**Memory is pull + push:** Pi-memory auto-injects keyword-relevant slices (push). Routing table session-start row reads MEMORY.md directly for full orientation (pull). Both serve different purposes.

---

## Key Design Decisions

| Decision | What | Why |
|----------|------|-----|
| Two files run the project | AGENTS.md + settings.json only | PI.md and CLAUDE.md were redundant — removed |
| APPEND_SYSTEM.md default | Extend pi's prompt, don't replace | Replacing means owning everything pi's default handled |
| pi-memory as default | Not optional, not flat-file | Auto-injection is superior; no manual navigation overhead |
| Custom skills always | Write our own, draw from community for conventions | Skills must reflect org-specific standards and vocabulary |
| Global/project in one AGENTS.md | Both layers, clear delineation | Full picture in one place; deploy global section separately |
| No DuckDB, no external memory | pi-memory is the standard | Navigation problem, not storage problem |

---

## What the Agent Experiences at Session Start

1. Pi loads `~/.pi/agent/AGENTS.md` (global)
2. Pi loads `[project]/AGENTS.md` (project layer appends)
3. Pi loads `APPEND_SYSTEM.md` → added to system prompt
4. Pi loads `SOUL.md` if present
5. Pi-memory fires `before_agent_start` → injects 16K of relevant memory
6. Agent reads routing table → sees session-start row → reads `memory/MEMORY.md` directly
7. Agent fully oriented. Ready to work.

**Total context cost before first task:** ~1,000–2,500 tokens depending on MEMORY.md density.

---

## Setup: New Project From Scratch

**One-time (per machine):**
```bash
npm install -g @mariozechner/pi-coding-agent
pi install npm:pi-memory
cp global/AGENTS.md ~/.pi/agent/AGENTS.md  # fill in org name + standards
```

**Per project:**
```bash
cp -r base/ ~/projects/my-project/
cd ~/projects/my-project/
# 1. Fill in AGENTS.md (project layer: description, workspaces, routing table, rules)
# 2. Fill in context/ files with real detail
# 3. Rename workspaces/ to actual work areas, fill in each CONTEXT.md
# 4. Copy needed skills from skills/ into project's skills/
# 5. Configure .pi/settings.json (model, tool permissions)
# 6. Delete all annotation comments
pi  # run
```

---

## What We Learned

**Pi's ~200 token prompt is a feature, not a constraint.** It means every token in context is a token you chose. The template's context engineering discipline becomes even more valuable — not less — compared to agents with heavy built-in prompts.

**The routing table IS the session discipline.** Without it, agents guess what to load. With it, every session starts from the same complete context regardless of who ran the last session.

**Context files + memory serve different time horizons.** `context/` = stable project facts (rarely changes). `workspaces/CONTEXT.md` = current work state (updates every session). `memory/` = accumulated knowledge (grows over time). None substitutes for another.

**Global/project separation is load-bearing.** Without it, org standards drift into individual projects and diverge. With it, you update standards once and every project inherits them on next run.

**Authoring quality is the actual product.** A generic `project.md` produces a generic agent. A specific, accurate `project.md` produces a specific, useful agent. The template is infrastructure; the content is what matters.

---

## What's Next / Open Questions

- Context files (`project.md`, `client.md`, etc.) need worked examples to show what "specific enough" actually looks like
- The `global/AGENTS.md` template could be more opinionated about org-wide routing patterns
- Skills for domain-specific work (research, writing, code, ops) could be added to the universal skills library
- A `README.md` for the repo root (currently using CLAUDE.md as the entry point — may want a lighter-weight intro)
