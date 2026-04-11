# MASTER-claude-pi-template — Blueprint

## What This Is

A template for building project repos that a pi.dev agent can fully inhabit — without external memory, database dependencies, or special tooling. The agent reads the files, understands the project, and knows how to work.

The core premise: **a well-structured repo is the agent's brain.** The quality of the output is a direct function of how well these files are written. Generic files produce generic output. Specific files produce specific, high-quality work.

**Default agent:** [pi.dev](https://github.com/badlogic/pi-mono) — open-source, MIT-licensed, model-agnostic coding agent. ~200 token system prompt. Works with Claude, OpenAI, Gemini, and 12+ other providers.

---

## The Mental Model

There are three layers to how a pi agent knows what it's doing:

```
Layer 1: Pi's ~200 token system prompt       ← what pi brings natively
Layer 2: Your context files (this template)  ← what you provide
Layer 3: Pi-memory auto-injection            ← what accumulates over time
```

Layer 1 is tiny by design — pi intentionally leaves room for you. Layer 2 is what this template provides. Layer 3 is what grows as the agent works. Together they form a complete picture.

---

## Architecture Overview

```
MASTER-claude-pi-template/
│
├── global/                    ← Org-layer (install once, applies everywhere)
│   └── AGENTS.md
│
├── base/                      ← Project template (copy this for each new project)
│   ├── AGENTS.md              ← Pi's primary config — the agent's operating manual
│   ├── APPEND_SYSTEM.md       ← Extends pi's system prompt (recommended)
│   ├── SYSTEM.md              ← Replaces pi's system prompt (power user)
│   ├── SOUL.md                ← Persona and tone (optional)
│   ├── .pi/
│   │   └── settings.json      ← Model, tools, memory path, compaction
│   ├── context/               ← Static project knowledge (read by routing table)
│   │   ├── project.md
│   │   ├── client.md
│   │   ├── stack.md
│   │   └── decisions.md
│   ├── workspaces/            ← Where work actually happens
│   │   └── [workspace-name]/
│   │       └── CONTEXT.md     ← Current state of this workspace
│   └── memory/                ← Pi-memory compatible — accumulates over time
│       ├── MEMORY.md
│       ├── SCRATCHPAD.md
│       └── daily/
│
└── skills/                    ← Universal skills (copy what you need per project)
    ├── stop-slop.md
    ├── doc-authoring.md
    ├── context-update.md
    ├── memory-write.md
    └── memory-query.md
```

**Two files run the whole project:** `AGENTS.md` is the agent's operating manual (what pi reads). `.pi/settings.json` is the harness config (model, tools, memory path). Everything else is content — context files, workspace state, memory, skills.

---

## How Pi Loads Files

Pi uses **hierarchical loading** — files compose in this order:

```
1. ~/.pi/agent/AGENTS.md       ← global org config
2. [parent directories]        ← any intermediate AGENTS.md files
3. [project root]/AGENTS.md    ← this project's config
```

Later files append to earlier ones. Global rules come first. Project-specific rules layer on top. The agent sees the combined result.

**This is the foundation the whole template is built on.** It means you write org-wide standards once and every project inherits them automatically.

---

## The Two-Layer Architecture

### Layer 1 — Global (`global/AGENTS.md`)

Install once at `~/.pi/agent/AGENTS.md`. Never touch again unless org standards change.

Contains:
- Who the agent is across all org work
- Rules true for every project without exception
- Org-wide communication tone

**Rule of thumb:** If it would be the same across every project, it's global.

### Layer 2 — Project (`base/AGENTS.md`)

Lives in each project's root. Filled in fresh for every project.

Contains:
- What this specific project is and produces
- Workspace map
- Routing table
- Project-specific naming conventions and rules
- What the agent must not do in this project

**Rule of thumb:** If it would change between projects, it's project-level.

**Important:** The `base/AGENTS.md` template contains both layers in one file with clear visual delineation — so you can see and fill in the full picture in one place. When deploying, extract the global section to `~/.pi/agent/AGENTS.md` and leave the project section in the project root.

---

## File-by-File Reference

### `AGENTS.md` — The Agent's Operating Manual

**What pi does with it:** Reads it hierarchically at every session start. This is the primary config.

**What goes in it (project layer):**
- One paragraph describing the project — specific, not generic
- Workspace list with one-line descriptions
- The routing table
- Naming conventions
- Project-specific behavioral rules
- Out-of-bounds list

The routing table is the most critical artifact. It maps every task type to a workspace, a set of files to read, and skills to load. When a task arrives, the agent checks the table and starts from full context — every time.

```
| Task Type     | Workspace   | Read                                    | Load Skills              |
|---------------|-------------|------------------------------------------|--------------------------|
| Session start | —           | memory/MEMORY.md                        | memory-query.md          |
| Write content | /drafting   | context/project.md + drafting/CONTEXT.md | stop-slop.md             |
| Research      | /research   | context/client.md + research/CONTEXT.md  | —                        |
| Session end   | —           | —                                        | memory-write.md          |
```

---

### `APPEND_SYSTEM.md` — System Prompt Extension

**What pi does with it:** Prepends content to its ~200 token default system prompt.

**Use this (not SYSTEM.md) for most projects.** Extending pi's defaults is safer than replacing them.

**What goes in it:**
- Communication style that applies to all tasks in this project
- Persistent tone and output format instructions
- Short domain context that should always be present

**What doesn't go in it:** Routing logic, workspace structure, task-specific rules — those belong in AGENTS.md.

---

### `SYSTEM.md` — Full System Prompt Replacement

**What pi does with it:** Replaces its entire default system prompt.

**Use only when** pi's default behavior actively conflicts with what you need, or you're building a highly specialized agent with a narrow, defined persona.

**Risk:** You take full responsibility for everything pi's default previously handled. Test carefully.

---

### `SOUL.md` — Persona and Tone

**What pi does with it:** Customizes the agent's communication character.

**Optional.** Delete it if the project doesn't need a defined persona.

**Use it when:**
- The agent has a named role within your org
- The project requires a specific brand voice
- Default pi tone doesn't match the project's communication expectations

**What goes in it:** Voice in 2-3 words + specific examples. What the agent does NOT do (often more useful than describing what it should). How it handles uncertainty.

---

### `.pi/settings.json` — Project Settings Override

**What pi does with it:** Overrides `~/.pi/settings.json` for this project only.

**What to configure:**
- `model` — which LLM to use for this project
- `tools` — permission levels (allow / ask / deny) per tool
- `compaction` — auto or manual context compaction
- `memory.dir` — where pi-memory stores its files (set to `memory` for project-relative storage)

Remove any key you want to inherit from global settings.

---

### `context/` — Static Project Knowledge

**What pi does with it:** Nothing automatically. The routing table tells the agent when to read specific files.

**The four files:**

| File | What It Contains |
|------|-----------------|
| `project.md` | What the project is, scope, deliverables, goals |
| `client.md` | Who the client/owner is, preferences, communication style |
| `stack.md` | Technical stack, tools, infrastructure, integration points |
| `decisions.md` | Architectural and strategic decisions already made — prevents relitigating |

**Key principle:** Context files are rich, specific, and accurate. A vague context file is worse than no context file — it primes the agent incorrectly.

---

### `workspaces/[name]/CONTEXT.md` — Workspace Current State

**What pi does with it:** Nothing automatically. The routing table tells the agent to read this before any work in that workspace.

**What goes in it:**

```
## In Progress
- [what's actively being worked on — specific, not vague]

## Done
- [recently completed items — prune to last 10]

## Queued
- [next tasks, in priority order]

## Blocked
- [what's stuck and specifically why]

## Standards
- [conventions established for this workspace]

## Key References
- [files the agent will need in future sessions]
```

**This file must be updated at the end of every session where work was done.** A stale CONTEXT.md means the agent starts the next session with false state. The `context-update` skill governs this protocol.

---

### `memory/` — Persistent Cross-Session Memory

**Powered by:** [pi-memory extension](https://github.com/jayzeng/pi-memory)

**Install once:** `pi install npm:pi-memory`

**How it works:** Pi-memory hooks into `before_agent_start` and prepends relevant memory to the system prompt automatically before every turn. 16K budget. BM25 keyword search surfaces entries relevant to the current prompt. No action required — it just works.

**Three files, three purposes:**

#### `memory/MEMORY.md` — Long-Term Knowledge

Curated facts that are true for the life of the project. Uses `#tags` and `[[wiki-links]]` for searchability.

```markdown
#decision [[database]] Chose PostgreSQL for all storage.
Evaluated MySQL — ruled out due to weaker JSON support.
Constraint: event log schema requires JSONB queries.

#preference [[deliverables]] All outputs export to Google Drive, not raw Markdown.
Client reviews in Drive. Never send .md files directly.

#pattern [[research]] Two-pass approach works best: collect raw sources first,
synthesize second. Skipping to synthesis misses edge cases.

#lesson [[client-comms]] Client wants open questions in a numbered list at the
top of any deliverable — not inline. Confirmed on Q3 review call.
```

Tag vocabulary: `#decision`, `#pattern`, `#preference`, `#lesson`, `#bug`

#### `memory/SCRATCHPAD.md` — Active Working Items

Markdown checklist of open items. Pi-memory injects open items only — checked items are automatically excluded.

```markdown
- [ ] [2026-04-10] Follow up on client feedback for Section 4 draft
- [ ] Wire summary export to Drive API
- [x] Finalize section headers for onboarding doc
```

#### `memory/daily/YYYY-MM-DD.md` — Session Logs

Append-only logs, one file per day. Auto-created by pi-memory during context compaction. Write manually for explicit session closure.

```markdown
<!-- 2026-04-10 17:30:00 -->
#session Onboarding doc first draft
- Completed sections 1-3
- Decided numbered steps throughout [[client-prefs]]
- Section 4 (tool setup) still pending
```

**Memory injection priority (16K total):**
1. Scratchpad open items (2K)
2. Today's daily log tail (3K)
3. BM25 search results matching current prompt (2.5K)
4. MEMORY.md long-term content (4K)
5. Yesterday's daily log (3K — trimmed first if budget runs out)

**The routing table session-start row** (`read memory/MEMORY.md`) exists alongside auto-injection because they serve different purposes: auto-injection surfaces keyword-relevant slices; the explicit read gives the agent the complete picture for full orientation. Keep both. Remove the routing row only if memory is consistently sparse.

---

### `skills/` — Universal Skills

Skills are plain markdown files. Behavioral instructions, standards, and process guides. An agent doesn't have a skill unless the routing table loads it — explicit, not ambient.

| Skill | Purpose | Load When |
|-------|---------|-----------|
| `stop-slop.md` | Strips AI writing patterns from prose | Any prose output |
| `doc-authoring.md` | Structure-first documentation methodology | Creating or updating docs |
| `context-update.md` | Protocol for keeping CONTEXT.md current | Session end |
| `memory-write.md` | Pi-memory write protocol — three destinations, tag vocabulary | Session end |
| `memory-query.md` | Pi-memory retrieval — auto-injection awareness, explicit search | Session start |

**Custom skills are the default.** The skills in this repo are yours to own and extend. When community skills (pi-skills ecosystem) offer useful patterns or tool conventions, draw from them — but the skill files themselves should reflect your org's specific standards and vocabulary.

---

## Setup: New Project From Scratch

**One-time machine setup (do once, never again):**

```bash
# 1. Install pi
npm install -g @mariozechner/pi-coding-agent

# 2. Install pi-memory
pi install npm:pi-memory

# 3. Install global org config
cp global/AGENTS.md ~/.pi/agent/AGENTS.md
# Fill in org name, standards, tone
```

**Per-project setup:**

```bash
# 1. Copy base/ to your new project
cp -r base/ ~/projects/my-new-project/
cd ~/projects/my-new-project/

# 2. Fill in AGENTS.md
# - Global layer: copy to ~/.pi/agent/AGENTS.md if not done yet
# - Project layer: fill in project description, workspaces, routing table, rules

# 3. Fill in context/ files
# context/project.md  — what this project is
# context/client.md   — who it's for
# context/stack.md    — tools and infrastructure
# context/decisions.md — decisions already made

# 4. Rename and set up workspaces
# Rename workspaces/example-workspace-1/ to something meaningful
# Fill in each workspace's CONTEXT.md with initial state

# 5. Copy relevant skills
# The skills/ folder at the repo root contains universal skills
# Copy what this project needs into [project]/skills/
# Add project-specific skills as needed

# 6. Configure .pi/settings.json
# Set your preferred model, tool permissions, memory path

# 7. Delete annotation comments
# Go through every file and remove the <!-- What goes here: --> blocks
# Replace placeholder text with real content
```

**Run pi:**
```bash
cd ~/projects/my-new-project/
pi
```

---

## What the Agent Experiences at Session Start

In order, before any task is addressed:

1. Pi loads `~/.pi/agent/AGENTS.md` (global org config)
2. Pi loads `[project]/AGENTS.md` (project config) — appended to global
3. Pi loads `APPEND_SYSTEM.md` — added to system prompt
4. Pi loads `SOUL.md` if present — persona applied
5. Pi-memory fires `before_agent_start` hook — injects 16K of relevant memory
6. Agent reads the routing table in AGENTS.md
7. Agent sees session-start row → reads `memory/MEMORY.md` explicitly
8. Agent is now fully oriented and ready to work

Total context cost before any task begins: approximately 1,000–2,500 tokens depending on MEMORY.md size and project config density.

---

## Design Principles

**The repo is the brain.** The agent has no memory between sessions except what lives in files. If something isn't written down, it doesn't exist for the agent.

**Pi's leanness is an asset.** The ~200 token system prompt is not a limitation — it's space you control. Every token of context in pi is a token you chose to put there.

**Global/project separation prevents drift.** Org-wide standards in global AGENTS.md means projects can't accidentally override them, and you update standards once instead of across every project.

**Skills are explicit contracts.** The agent has exactly the skills the routing table loads — nothing more, nothing assumed. This keeps behavior predictable and auditable.

**Memory accumulates, context stays lean.** CONTEXT.md captures current task state. Memory captures what was learned. Neither substitutes for the other. Both are required.

**Authoring quality is the product.** A vague AGENTS.md, a sparse context/, an outdated CONTEXT.md — these aren't configuration problems, they're output quality problems. The template is only as good as the content written into it.
