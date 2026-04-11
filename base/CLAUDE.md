# [Project Name]

<!-- AUTHORING NOTE: This file is the authoring reference and Claude Code fallback.
     For pi.dev projects, the agent reads AGENTS.md — that is the live config.
     CLAUDE.md serves two roles:
     1. Reference for the template author filling in project details
     2. Fallback config when using Claude Code instead of pi.dev

     Keep AGENTS.md and CLAUDE.md in sync as you fill them in.
     If you are running this project exclusively with pi.dev, CLAUDE.md is optional. -->

---

[One paragraph describing the project, client/owner, and what it produces]

---

## Workspaces

- `/workspaces/[workspace-a]` — [what this workspace is for]
- `/workspaces/[workspace-b]` — [what this workspace is for]
- `/workspaces/[workspace-c]` — [what this workspace is for]

---

## Routing

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
- [Any project-specific conventions]

---

## Behavioral Rules

- Always read this file before beginning any task
- Load the relevant workspace CONTEXT.md before producing any output
- Do not create files outside designated workspace folders
- Ask before overwriting any file marked [FINAL]
- Write to memory (MEMORY.md or daily log) before closing any productive session
- [Project-specific rule]
- [Project-specific rule]

---

## Out of Bounds

- [Action the agent must not take without explicit instruction]
- [Action the agent must not take without explicit instruction]
