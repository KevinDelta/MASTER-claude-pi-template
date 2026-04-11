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

     MEMORY ROW NOTE:
     Pi-memory auto-injects relevant context before every turn (scratchpad, daily log,
     search results, MEMORY.md — up to 16K). You don't need this row for memory to work.
     Keep it for explicit full orientation at session start — reading MEMORY.md directly
     gives you the complete picture, not just keyword-matched slices.
     Remove it if your project has sparse memory and auto-injection is sufficient. -->

| Task Type | Workspace | Read | Load Skills |
|-----------|-----------|------|-------------|
| Session start | — | memory/MEMORY.md | memory-query.md |
| [task description] | /workspaces/[workspace-a] | context/project.md + [workspace-a]/CONTEXT.md | [skill.md or —] |
| [task description] | /workspaces/[workspace-b] | context/client.md + [workspace-b]/CONTEXT.md | [skill.md or —] |
| [task description] | /workspaces/[workspace-c] | context/project.md + [workspace-c]/CONTEXT.md | [skill.md or —] |
| Session end | — | — | memory-write.md + context-update.md |

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

## Out of Bounds

- [Action the agent must not take without explicit instruction]
- [Action the agent must not take without explicit instruction]
