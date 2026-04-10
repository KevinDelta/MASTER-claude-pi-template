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

## Memory Layer (Optional)

The base template is stateless. For short, bounded projects that's a feature. For longer-running projects, add the optional `memory/` folder.

**Add memory when any of these apply:**
- Project will run longer than 3 months
- Agent needs to recall decisions or patterns from past sessions without reading all history
- Accumulated knowledge of the project is itself a deliverable
- Workspace CONTEXT.md files are growing unwieldy

**How it works:** Three files — `index.md` (navigation catalog, read first every session), `log.md` (append-only, grep-navigable record), and topic pages (consolidated knowledge on specific subjects). No database. No external tooling. Obsidian-compatible as a bonus.

**To activate:** Copy `base/memory/` into your project, add memory rows to your routing table, add the session-end guardrail to PI.md, and copy `skills/memory-write.md` and `skills/memory-query.md` into your project's skills folder.

The routing table entry that makes it embedded (not bolted-on):
```
| Session start (if memory/ exists) | — | memory/index.md | memory-query.md |
```

---

## What's in This Repo

```
base/                       ← annotated template, copy to start a project
├── CLAUDE.md
├── PI.md
├── context/
│   ├── project.md
│   ├── client.md
│   ├── stack.md
│   └── decisions.md
├── workspaces/
│   └── example-workspace/
│       └── CONTEXT.md
└── memory/                 ← optional, copy when project scale warrants it
    ├── index.md
    ├── log.md
    └── example-topic.md

skills/                     ← universal skills with real content
├── stop-slop.md
├── doc-authoring.md
├── context-update.md
├── memory-write.md         ← pair with memory layer
└── memory-query.md         ← pair with memory layer
```
