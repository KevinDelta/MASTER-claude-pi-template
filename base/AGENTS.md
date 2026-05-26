# AGENTS.md — [Project Name]

<!-- PROJECT LAYER — lives in <project-root>/AGENTS.md
     OpenClaw domain workspace loads global + domain instructions first.
     Project work then reads THIS FILE and applies project routing overrides.

     WHAT BELONGS HERE:
     - This project's description, client, and scope
     - This project's areas and what happens in each
     - Routing table rows for this project's task types (override domain rows by matching Task Type key)
     - Project-specific rules and out-of-bounds

     Rule of thumb: if the same across all projects in this domain → domain layer.
     If it changes between projects → here.

     HARNESS SETTINGS (model, channel routing, heartbeat, plugins, memory path):
     Those live in OpenClaw config and the domain workspace — not here. -->

---

## Project

<!-- What this project is, who it's for, and what it produces.
     Specific. "A content system producing weekly newsletter issues and LinkedIn posts
     for [Client], targeting [audience], with [goal]" — not "a client project." -->

[One paragraph describing the project, client/owner, and what it produces]

---

## Areas

<!-- List every area directory under areas/. Name for what work happens there.
     Good: /drafting, /research, /production, /client-comms
     Bad: /documents, /files, /misc -->

- `/areas/[area-a]` — [what work happens here]
- `/areas/[area-b]` — [what work happens here]
- `/areas/[area-c]` — [what work happens here]
- `/inbox/_inbox/` — raw artifacts waiting to be distilled (call transcripts, notes, clipped articles)
- `/inbox/_processed/` — archived sources, post-distillation
- `/templates/` — output shells referenced by producer skills via `Template:` front-matter

---

## Routing

<!-- Every task type the agent will do needs a row.
     Task arrives → agent checks table → loads what it says → starts from context.
     If a task type isn't here, the agent checks the domain routing table, then asks before guessing.
     Routing is mandatory for direct CLI turns, channel-routed turns, and heartbeat follow-up work.

     ROUTING BOUNDARY:
     - OpenClaw native routing decides whether this project/domain agent receives the message.
     - This table decides how the selected agent performs the work.
     Do not encode channel/account/peer bindings here. Put those in OpenClaw config.

     HOW OVERRIDES WORK:
     - Domain routing rows apply unless a project row matches the same Task Type first keyword
     - Add rows only for task types unique to this project or that override domain defaults
     - Always include Session start and Session end rows if this project needs project-specific behavior

     MEMORY NOTE:
     Domain memory lives in ~/.openclaw/workspace/memory.db and MEMORY.md.
     Session start reads MEMORY.md for full orientation. Use domain-memory plugin tools for keyword/semantic recall.
     Remove the session-start row only if you want the domain default to apply unchanged.

     PROJECT_ID must be set in the project env source so observations are tagged to this project. -->

| Task Type | Area | Read | Load Skills |
|-----------|------|------|-------------|
| **Session start** — orient before any work | — | `context/project.md` | `memory-query.md` |
| **Plan / scope** — define phases, break down work, create task list | /areas/[area-a] | `context/project.md` + `[area-a]/CONTEXT.md` | `doc-authoring.md` |
| **Research** — gather information, synthesize sources, produce a brief | /areas/[area-b] | `context/client.md` + `context/project.md` + `[area-b]/CONTEXT.md` | — |
| **Write / draft** — produce first draft of any deliverable | /areas/[area-a] | `context/project.md` + `context/client.md` + `[area-a]/CONTEXT.md` | `stop-slop.md` |
| **Edit / revise** — refine existing draft, apply feedback | /areas/[area-a] | `[area-a]/CONTEXT.md` | `stop-slop.md` |
| **Review / QA** — check deliverable against brief and standards | /areas/[area-a] | `context/project.md` + `[area-a]/CONTEXT.md` | `stop-slop.md` |
| **Client comms** — draft message, email, or update for client | /areas/[area-b] | `context/client.md` + `[area-b]/CONTEXT.md` | `stop-slop.md` |
| **Document** — update AGENTS.md, CONTEXT.md, decisions, reference docs | — | `context/project.md` | `doc-authoring.md` |
| **Build / code** — write, edit, or debug code | /areas/[area-c] | `context/stack.md` + `[area-c]/CONTEXT.md` | — |
| **Analyze / synthesize** — process data, extract patterns, produce findings | /areas/[area-b] | `context/project.md` + `[area-b]/CONTEXT.md` | — |
| **Status / report** — summarize progress, produce a status update | — | `context/project.md` | `stop-slop.md` |
| **Commerce / invoice** — draft billable work or reimbursable expenses | — | `TOOLS.md` + `context/project.md` + `context/client.md` | `memory-query.md` |
| **Commerce / payment status** — check project-scoped Stripe payment state | — | `TOOLS.md` + `context/project.md` + `context/client.md` | `memory-query.md` |
| **Distill inbox** — process a raw artifact from `inbox/_inbox/` into pillars / decisions / skills | /inbox | `SOUL.md` + `context/project.md` + recent `context/decisions.md` | `distill-inbox.md` |
| **Harness** — modify AGENTS.md, skills, plugins, OpenClaw config, or settings | — | `BLUEPRINT.md` | `harness-dev.md` |
| **Session end** — update state and write memory | — | — | `memory-write.md` + `context-update.md` |

---

## Naming Conventions

- Drafts: `topic-name_draft.md`
- Finals: `topic-name_final.md`
- Dated files: `YYYY-MM-DD-filename.md`
- [Any project-specific convention]

---

## Project-Specific Rules

<!-- Only rules unique to this project. Global and domain rules already apply — don't repeat them. -->

- [Project-specific rule — e.g., "Never send anything to the client without review"]
- [Project-specific rule — e.g., "Do not modify pricing files without confirmation"]

---

## Routed Skills

<!-- Domain skills are loaded from ~/.openclaw/workspace/skills/*.md.
     OpenClaw exposes configured skill directories to the agent.
     This table does not perform discovery; it documents when routing rows should use each skill.
     List project-level skills here. Domain-level skills are listed in the domain AGENTS.md. -->

| Skill | When It Loads |
|-------|--------------|
| `stop-slop.md` | Any prose output — reports, proposals, briefs, emails |
| `doc-authoring.md` | Creating or updating AGENTS.md, CONTEXT.md, reference docs |
| `context-update.md` | End of any session where workspace state changed |
| `memory-write.md` | Session end — decisions, patterns, lessons to persist |
| `memory-query.md` | Session start — orientation before first task |
| `distill-inbox.md` | User asks to process inbox items, clear the inbox, or make sense of dropped artifacts |
| `[your-skill].md` | [When to load it] |

### Producer skills and templates

Skills come in two flavors:

- **Modifier skills** — shape *how* the agent works (`stop-slop`, `memory-write`, `doc-authoring`, `distill-inbox`). No output contract.
- **Producer skills** — produce a shaped deliverable. Declare their output contract via an optional `Template:` front-matter line that points to a file in `templates/`.

Example producer skill front-matter:

```yaml
---
Template: executive-brief.md
---
```

When a producer skill loads, the agent also loads the referenced template and fills its shape. Templates live in `base/templates/` (project-wide) with optional `base/areas/<area>/templates/` overrides. See [ADR-0001](../docs/adr/0001-templates-and-skills-separation.md).

---

## Out of Bounds

<!-- Hard stops — actions the agent must never take without explicit user instruction.
     These extend (not replace) global and domain out-of-bounds.
     Enforced by OpenClaw/host permissions when configured. Keep TOOLS.md aligned with this list. -->

- Never delete files or directories without explicit confirmation
- Never force-push to any branch (`git push --force`)
- Never read or modify `.env` files, `auth.json`, or files named `secrets.*`
- Never hard reset git state (`git reset --hard`)
- Never send output to an external party (client, email, API) without review
- Never create project payment links, Checkout Sessions, invoices, or refunds unless domain `DOCK.md` permits the action and the worker has approved required side effects
- [Project-specific hard stop]
