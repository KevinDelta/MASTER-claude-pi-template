# MASTER-claude-pi-template

A reusable template system for building Pi agent project repos — self-contained directories that give a stateless agent everything it needs to operate without external memory.

The core idea: a well-structured repo IS the agent's brain. Drop a pi.dev agent into a properly built project and it knows what the project is, where to work, what skills to load, and how to behave — from the files alone.

**Default agent:** [pi.dev](https://github.com/badlogic/pi-mono) — open-source, MIT-licensed, model-agnostic coding agent.

---

## How to Use This Template

1. Copy the `base/` directory into your new project root
2. Fill in `AGENTS.md` — project description, workspaces, routing table, rules
3. Fill in all `context/` files with real project information
4. Rename workspaces to match your project's actual work areas
5. Copy relevant skills from `skills/` into your project's `skills/` folder
6. Configure `.pi/settings.json` — model, tools, memory path
7. Delete the annotation comments before going live

The quality of the agent's output is a direct function of how well these files are written. Generic files produce generic output.

---

## Two Files Run the Project

**`AGENTS.md`** — the agent's operating manual. Pi reads this at every session start. Contains the routing table, workspace map, behavioral rules, and out-of-bounds. This is what the agent knows.

**`.pi/settings.json`** — the harness config. Controls model, tool permissions, compaction behavior, and memory path. Pi reads this for operational settings. The agent never sees it directly.

Everything else — context files, workspace CONTEXT.md, memory, skills — is content that AGENTS.md points to.

---

## The Routing Table

The routing table in AGENTS.md is what makes stateless operation workable. Every session, the agent reads AGENTS.md, finds the routing table, and knows exactly what context to load and what skills to activate before touching any work.

```
| Task Type     | Workspace   | Read                                     | Load Skills   |
|---------------|-------------|------------------------------------------|---------------|
| Session start | —           | memory/MEMORY.md                         | memory-query  |
| Write content | /drafting   | context/project.md + drafting/CONTEXT.md | stop-slop     |
| Research      | /research   | context/client.md + research/CONTEXT.md  | —             |
| Session end   | —           | —                                        | memory-write  |
```

The routing table is a contract. When a task arrives, the agent checks the table, loads what it says, and starts from context — every time.

---

## How Skills Work

Skills are plain markdown files — behavioral instructions, standards, and process guides. A skill tells the agent how to do a specific type of work to a specific standard.

Skills load on demand via the routing table. The agent doesn't have a skill unless the routing table loads it. This keeps behavior predictable.

**Universal skills** (this repo's `skills/` folder):
- `stop-slop.md` — strip AI writing patterns from prose
- `doc-authoring.md` — structure-first documentation methodology
- `context-update.md` — keep workspace CONTEXT.md files current after sessions
- `memory-write.md` — pi-memory write protocol (three destinations, tag vocabulary)
- `memory-query.md` — pi-memory retrieval and auto-injection awareness

Copy what each project needs into its own `skills/` folder.

---

## The Two-Layer Architecture

Pi loads AGENTS.md hierarchically — global first, then project. Both layers live in one `base/AGENTS.md` template with clear delineation:

| Layer | Deploy to | Applies to |
|-------|-----------|------------|
| Global (top section) | `~/.pi/agent/AGENTS.md` | Every project on this machine |
| Project (bottom section) | `[project-root]/AGENTS.md` | This project only |

`global/AGENTS.md` is the standalone org-layer template — install once, inherit everywhere.

---

## Memory Layer

Memory is included in every project. Uses the **pi-memory extension** (`github.com/jayzeng/pi-memory`), which auto-injects relevant context before every agent turn via BM25 keyword search.

**Three files, three purposes:**
- `MEMORY.md` — long-term knowledge: `#decision`, `#pattern`, `#preference`, `#lesson`, `#bug` with `[[wiki-links]]`
- `SCRATCHPAD.md` — active checklist: `- [ ]` open, `- [x]` done (completed items excluded from injection)
- `daily/YYYY-MM-DD.md` — append-only session logs

**Install once per machine:**
```bash
pi install npm:pi-memory
```

---

## Structural Principles

**Two files, everything else is content.** AGENTS.md is the operating manual. settings.json is the harness config. Context files, CONTEXT.md, memory, and skills are content — rich, specific, and accurate.

**Global/project separation prevents drift.** Org-wide standards in global AGENTS.md means you write them once and every project inherits them.

**Skills are explicit contracts.** The agent has exactly the skills the routing table loads — nothing more, nothing assumed.

**Memory accumulates, context stays lean.** CONTEXT.md captures current task state. Memory captures what was learned. Neither substitutes for the other.

**Authoring quality is the product.** A vague AGENTS.md or sparse context files aren't configuration problems — they're output quality problems.

---

## What's in This Repo

```
global/                        ← org-layer template (install once per machine)
└── AGENTS.md                  ← deploy to ~/.pi/agent/AGENTS.md; applies to all projects

base/                          ← annotated template, copy to start a project
├── AGENTS.md                  ← pi.dev primary config (routing, workspaces, rules)
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
│   └── [workspace-name]/
│       └── CONTEXT.md
└── memory/
    ├── MEMORY.md
    ├── SCRATCHPAD.md
    └── daily/

skills/                        ← universal skills with real content
├── stop-slop.md
├── doc-authoring.md
├── context-update.md
├── memory-write.md
└── memory-query.md
```
