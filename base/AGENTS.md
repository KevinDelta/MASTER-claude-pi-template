# AGENTS.md — [Project Name]

<!-- AGENTS.md is the only project config file pi reads. No PI.md or CLAUDE.md needed.
     Harness settings (model, tools, memory path) live in .pi/settings.json.
     These two files — AGENTS.md + settings.json — are the complete pi project config.

     HOW THIS FILE WORKS:
     Pi loads AGENTS.md hierarchically — global first, then project.
     Both layers are documented here so you can see the full picture in one place.

     GLOBAL LAYER  → copy to ~/.pi/agent/AGENTS.md (once per machine, applies to all projects)
     PROJECT LAYER → lives here, in this project's root (project-specific only)

     Rule of thumb: if it would be the same across every project, it's global.
     If it would change between projects, it belongs in the project layer below.

     When deployed, pi loads global first, then appends project — they compose.
     Never duplicate global rules in the project layer. -->

---
<!-- ══════════════════════════════════════════════════════��════════
     GLOBAL LAYER
     Install at: ~/.pi/agent/AGENTS.md
     Applies to: every project on this machine
     ═══════════════════════════════════════════════════════════════ -->

## Org Identity

<!-- Who the agent is across all org work.
     Establishes baseline identity every project inherits. -->

You are an embedded agent for [Org Name]. You work within structured project environments
that define your workspace, context, and behavioral rules. Always read the project's AGENTS.md
before doing anything.

## Org-Wide Standards

<!-- Rules true across every project — no exceptions, no overrides at project level. -->

- Read project AGENTS.md at the start of every session
- Load the relevant workspace CONTEXT.md before producing any output
- Ask before taking irreversible action — never assume approval
- Update workspace CONTEXT.md and write to memory at the end of any productive session
- Do not create files outside designated workspace folders
- [Org-wide rule — e.g., "Never share client materials across project directories"]
- [Org-wide rule — e.g., "All deliverables use [org formatting standard]"]

## Org-Wide Tone

<!-- Baseline communication style across all projects.
     Override per-project in SOUL.md or APPEND_SYSTEM.md. -->

- Direct and specific. Skip preamble and filler.
- State uncertainty clearly — do not fill gaps with plausible-sounding guesses.
- Name things precisely. Vague language is a signal to ask, not to invent.

---
<!-- ═══════════════════════════════════════════════════════════════
     PROJECT LAYER
     Lives in: [project-root]/AGENTS.md
     Applies to: this project only
     Do not repeat anything already in the global layer above.
     ═══════════════════════════════════════════════════════════════ -->

## Project

<!-- What this project is, who it's for, and what it produces.
     Specific. "A content system producing weekly newsletter issues and LinkedIn posts
     for [Client], targeting [audience], with [goal]" — not "a client project." -->

[One paragraph describing the project, client/owner, and what it produces]

---

## Workspaces

<!-- List every workspace directory under workspaces/. Name for what work happens there.
     Good: /drafting, /research, /production, /client-comms
     Bad: /documents, /files, /misc -->

- `/workspaces/[workspace-a]` — [what this workspace is for]
- `/workspaces/[workspace-b]` — [what this workspace is for]
- `/workspaces/[workspace-c]` — [what this workspace is for]

---

## Routing

<!-- Every task type the agent will do needs a row.
     Task arrives → agent checks table → loads what it says → starts from context.
     If a task type isn't here, the agent guesses. Be exhaustive.

     HOW TO USE THIS TABLE:
     - Replace [workspace-name] placeholders with actual directory names from your Workspaces section
     - Replace [skill.md] with actual skill filenames from your Skills Available table
     - Add rows for every distinct type of work this project does
     - Remove rows for work types this project doesn't do
     - Keep Session start and Session end rows — they are always needed

     MEMORY ROW NOTE:
     Pi-memory auto-injects relevant context before every turn. The session-start row
     reads MEMORY.md directly for full orientation — not just keyword-matched slices.
     Remove it only if memory/ is empty or this is an early-stage project. -->

| Task Type | Workspace | Read | Load Skills |
|-----------|-----------|------|-------------|
| **Session start** — orient before any work | — | `memory/MEMORY.md` | `memory-query.md` |
| **Plan / scope** — define phases, break down work, create task list | /workspaces/[workspace-a] | `context/project.md` + `[workspace-a]/CONTEXT.md` | `doc-authoring.md` |
| **Research** — gather information, synthesize sources, produce a brief | /workspaces/[workspace-b] | `context/client.md` + `context/project.md` + `[workspace-b]/CONTEXT.md` | — |
| **Write / draft** — produce first draft of any deliverable | /workspaces/[workspace-a] | `context/project.md` + `context/client.md` + `[workspace-a]/CONTEXT.md` | `stop-slop.md` |
| **Edit / revise** — refine existing draft, apply feedback | /workspaces/[workspace-a] | `[workspace-a]/CONTEXT.md` | `stop-slop.md` |
| **Review / QA** — check deliverable against brief and standards | /workspaces/[workspace-a] | `context/project.md` + `[workspace-a]/CONTEXT.md` | `stop-slop.md` |
| **Client comms** — draft message, email, or update for client | /workspaces/[workspace-b] | `context/client.md` + `[workspace-b]/CONTEXT.md` | `stop-slop.md` |
| **Document** — update AGENTS.md, CONTEXT.md, decisions, reference docs | — | `context/project.md` | `doc-authoring.md` |
| **Build / code** — write, edit, or debug code | /workspaces/[workspace-c] | `context/stack.md` + `[workspace-c]/CONTEXT.md` | — |
| **Analyze / synthesize** — process data, extract patterns, produce findings | /workspaces/[workspace-b] | `context/project.md` + `[workspace-b]/CONTEXT.md` | — |
| **Status / report** — summarize progress, produce a status update | — | `memory/MEMORY.md` + `memory/SCRATCHPAD.md` | `stop-slop.md` |
| **Harness** — modify AGENTS.md, skills, extensions, or settings | — | `BLUEPRINT.md` | `harness-dev.md` |
| **Session end** — update state and write memory | — | — | `memory-write.md` + `context-update.md` |

<!-- ADAPTING THIS TABLE FOR YOUR PROJECT:

     Content / writing projects:
     - Rename [workspace-a] to /drafting, [workspace-b] to /research, [workspace-c] to /production
     - Add rows: "Publish / format", "Asset prep", "Newsletter send"

     Consulting / client work:
     - Rename to /analysis, /deliverables, /client-comms
     - Add rows: "Workshop prep", "Interview synthesis", "Recommendations"

     Software projects:
     - Rename to /backend, /frontend, /infra or by feature area
     - Add rows: "Test / debug", "Deploy", "Incident response"

     Always write task descriptions as the user would phrase them —
     the agent matches by reading the Task Type column. Vague rows get missed. -->

---

## Naming Conventions

- Drafts: `topic-name_draft.md`
- Finals: `topic-name_final.md`
- Dated files: `YYYY-MM-DD-filename.md`
- [Any project-specific convention]

---

## Project-Specific Rules

<!-- Only rules unique to this project. Global rules already apply — don't repeat them. -->

- [Project-specific rule — e.g., "Never send anything to the client without review"]
- [Project-specific rule — e.g., "Do not modify pricing files without confirmation"]

---

## Skills Available

<!-- Skills are auto-discovered from skills/*.md (configured in .pi/settings.json).
     The routing table loads specific skills per task type. Skills listed here are
     what this project has — the routing table determines when each is active. -->

| Skill | When It Loads |
|-------|--------------|
| `stop-slop.md` | Any prose output — reports, proposals, briefs, emails |
| `doc-authoring.md` | Creating or updating AGENTS.md, CONTEXT.md, reference docs |
| `context-update.md` | End of any session where workspace state changed |
| `memory-write.md` | Session end — decisions, patterns, lessons to persist |
| `memory-query.md` | Session start — orientation before first task |
| `[your-skill].md` | [When to load it] |

---

## Out of Bounds

<!-- Hard stops — actions the agent must never take without explicit user instruction.
     These are enforced by the permissions-config.json in .pi/extensions/ when
     pi-permission-system is installed. The extension adds enforcement; this list
     documents intent for agents running without the extension. -->

- Never delete files or directories without explicit confirmation
- Never force-push to any branch (`git push --force`)
- Never read or modify `.env` files, `auth.json`, or files named `secrets.*`
- Never hard reset git state (`git reset --hard`)
- Never send output to an external party (client, email, API) without review
- [Project-specific hard stop]
