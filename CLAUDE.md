# MASTER-claude-pi-template

A reusable template system for building Pi agent project repos — self-contained directories that give a stateless agent everything it needs to operate without external memory.

The core idea: a well-structured repo IS the agent's brain. Drop a Pi agent into a properly built project and it knows what the project is, where to work, what skills to load, and how to behave — from the files alone.

---

## How to Use This Template

1. Copy the `base/` directory into your new project root
2. Rename workspaces to match your project's actual work areas
3. Fill in all `context/` files with real project information
4. Copy relevant skills from `skills/` into your project's `skills/` folder
5. Write your routing table in `CLAUDE.md`
6. Delete the annotation comments before going live

The quality of the agent's output is a direct function of how well these files are written. Generic files produce generic output.

---

## The Three Core Files

Every Pi agent project is built on three layers:

### 1. CLAUDE.md — The Agent's Operating Manual

Read first, every session. Tells the agent what the project is, where work lives, what context to load, and what it must never do.

The routing table is the most critical artifact in this file. It maps every task type to a workspace, a set of files to read, and skills to load — so the agent always starts from a fully primed state.

### 2. PI.md — The Harness Config

Separate from CLAUDE.md. Declares the agent's operational parameters inside this specific project: scope, tools, skills index, behavioral guardrails, output defaults.

CLAUDE.md is about the project. PI.md is about how the agent runs inside it.

### 3. workspace/CONTEXT.md — Workspace Intelligence

Each workspace has its own CONTEXT.md. Contains current state (done / in progress / queued), standards, active skills, and key references. The agent reads this before doing any work in that workspace.

---

## The Routing Table

The routing table in CLAUDE.md is what makes stateless operation workable. Every session, the agent reads CLAUDE.md, finds the routing table, and knows exactly what context to load and what skills to activate before touching any work.

Example:

| Task Type | Workspace | Read | Load Skills |
|-----------|-----------|------|-------------|
| Draft or edit content | /writing | context/project.md + writing/CONTEXT.md | stop-slop.md |
| Research or gather data | /research | context/project.md + research/CONTEXT.md | — |
| Build or produce deliverables | /production | context/client.md + production/CONTEXT.md | doc-authoring.md |
| Review or finalize | /review | context/project.md + review/CONTEXT.md | stop-slop.md |

The routing table is a contract. When a task arrives, the agent checks the table, loads what it says, and starts from context — every time.

---

## How Skills Work

Skills are plain markdown files. They are behavioral instructions, standards, and process guides — not code. A skill tells the agent how to do a specific type of work to a specific standard.

Skills are loaded on demand via the routing table. They are project-scoped — if a skill isn't in the project's `skills/` folder, the agent doesn't have it. This keeps behavior predictable.

**Universal skills** (this repo's `skills/` folder) apply to any project type:
- `stop-slop.md` — remove AI writing patterns from prose
- `doc-authoring.md` — write documentation that is specific and scannable
- `context-update.md` — keep workspace CONTEXT.md files current after sessions

Copy the ones you need into your project's `skills/` folder.

---

## Structural Principles

**Separate priming from work.** The `context/` folder holds what the agent needs to understand. The `workspaces/` folders hold what the agent needs to do. They do not mix.

**Skills are explicit, not ambient.** The agent doesn't have a skill unless the routing table loads it. No guessing.

**Context is loaded, not assumed.** The routing table specifies exactly what to read. The agent never infers context from memory.

**Stateless by design.** The agent has no memory between sessions. The files compensate entirely. If something isn't in a file, it doesn't exist for the agent.

**Authoring quality is the product.** These templates are only as good as the content written into them. Treat every CLAUDE.md, context file, and CONTEXT.md as a first-class deliverable.

---

## Memory Layer

Memory is included in every project that uses this template. It uses the **pi-memory extension** (`github.com/jayzeng/pi-memory`), which auto-injects relevant context before every agent turn via BM25 keyword search.

**Three files, three purposes:**
- `MEMORY.md` — long-term knowledge: `#decision`, `#pattern`, `#preference`, `#lesson`, `#bug` tagged entries with `[[wiki-links]]`
- `SCRATCHPAD.md` — active checklist: `- [ ]` open items, `- [x]` completed (pi-memory stops injecting checked items)
- `daily/YYYY-MM-DD.md` — append-only session logs (auto-created on compaction; write manually for explicit session closure)

**Memory ROI:** Pays for itself on projects longer than 3 months, or any project where accumulated decisions and patterns need to survive session boundaries. On short, isolated projects the memory files simply stay sparse — no overhead.

**Install pi-memory once per machine:**
```bash
pi install npm:pi-memory
```

The routing table session-start row reads MEMORY.md explicitly for full orientation — auto-injection gives keyword-relevant slices, direct read gives the complete picture:
```
| Session start | — | memory/MEMORY.md | memory-query.md |
```

---

## Pi.dev as Default Agent

This template is built for **pi.dev** — an open-source, model-agnostic coding agent (`github.com/badlogic/pi-mono`). Pi's ~200 token system prompt means the project's context files do the real work. The template's design philosophy is a direct match for how pi was architected.

### What Pi Loads and When

Pi loads files hierarchically: `~/.pi/agent/` → parent directories → current project directory. All matched files compose (global first, project appends). This means:

**Two layers, one AGENTS.md template:**

The `base/AGENTS.md` template contains both layers in one file with clear delineation — so you can see and fill in the full picture in one place. When deploying:

| Layer | Source | Deploy to | Applies to |
|-------|--------|-----------|------------|
| Global | Top section of `base/AGENTS.md` | `~/.pi/agent/AGENTS.md` | Every project on this machine |
| Project | Bottom section of `base/AGENTS.md` | `[project-root]/AGENTS.md` | This project only |

`global/AGENTS.md` is the standalone org-layer template — install once, inherit everywhere. Never duplicate global rules in a project's AGENTS.md.

**Other pi config files (project-level only):**
- **`APPEND_SYSTEM.md`**: extends pi's default system prompt (tone, output defaults)
- **`SOUL.md`**: persona customization (optional — delete if not needed)
- **`.pi/settings.json`**: model, tool permissions, compaction, memory path

Skills load on demand — the agent doesn't have a skill unless the routing table loads it.

### Pi Config Files (new in `base/`)

| File | Purpose | Required? |
|------|---------|-----------|
| `AGENTS.md` | Primary project config — routing, workspaces, behavioral rules | Yes |
| `APPEND_SYSTEM.md` | Additive system prompt — tone, communication style, output defaults | Recommended |
| `SYSTEM.md` | Full system prompt replacement — only for specialized agents | Optional |
| `SOUL.md` | Persona customization | Optional |
| `.pi/settings.json` | Model, tool permissions, memory path, compaction | Optional |

`CLAUDE.md` is preserved as the authoring reference and Claude Code fallback. For pi.dev projects, `AGENTS.md` is the live config the agent reads.

### Memory — Pi-Memory Extension (Default)

Memory uses the **pi-memory extension** (`github.com/jayzeng/pi-memory`). It auto-injects relevant context before every agent turn. No manual routing is needed for memory to work — but the routing table still includes a session-start row to have the agent explicitly read MEMORY.md for full orientation.

**Install once per machine:**
```bash
pi install npm:pi-memory
```

**Memory files live at** `memory/` (project-relative, set in `.pi/settings.json`):

```
memory/
├── MEMORY.md       ← long-term: #decision, #pattern, #preference, #lesson, #bug
├── SCRATCHPAD.md   ← active items: - [ ] open  - [x] done
└── daily/
    └── YYYY-MM-DD.md  ← append-only session logs
```

Pi-memory injects up to 16K of context per turn (scratchpad → today's log → search results → MEMORY.md → yesterday's log). BM25 keyword search surfaces relevant entries automatically. Add optional `qmd` for semantic search.

Memory is always included — it is not optional. The `memory/` folder ships with every project that uses this template.

---

## What's in This Repo

```
global/                        ← org-layer template (install once per machine)
└── AGENTS.md                  ← deploy to ~/.pi/agent/AGENTS.md; applies to all projects

base/                          ← annotated template, copy to start a project
├── AGENTS.md                  ← pi.dev primary config (routing, workspaces, rules)
├── CLAUDE.md                  ← authoring reference + Claude Code fallback
├── PI.md                      ← harness config (tools, skills index, memory setup)
├── APPEND_SYSTEM.md           ← additive system prompt (recommended default)
├── SYSTEM.md                  ← full system prompt replacement (power user)
├── SOUL.md                    ← persona/tone (optional, delete if not needed)
├── .pi/
│   └── settings.json          ← model, tools, memory path, compaction
├── context/
│   ├── project.md
│   ├── client.md
│   ├── stack.md
│   └── decisions.md
├── workspaces/
│   └── example-workspace/
│       └── CONTEXT.md
└── memory/                    ← pi-memory compatible, always included
    ├── MEMORY.md              ← long-term knowledge (#tags + [[wiki-links]])
    ├── SCRATCHPAD.md          ← active checklist items
    └── daily/                 ← session logs, one file per day

skills/                        ← universal skills with real content
├── stop-slop.md
├── doc-authoring.md
├── context-update.md
├── memory-write.md            ← pi-memory tools + write conventions
└── memory-query.md            ← pi-memory retrieval + auto-injection awareness
```
