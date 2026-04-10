# [Project Name]

<!-- What goes here: One paragraph. What this project is, who it's for, and what it produces.
     Be specific. "A client project" is not enough. "A content system producing weekly newsletter
     issues and LinkedIn posts for [Client], targeting [audience], with [goal]" is.
     The agent reads this to understand context before doing anything. Make it count. -->

[One paragraph describing the project, client/owner, and what it produces]

---

## Workspaces

<!-- What goes here: List every workspace directory under workspaces/. One line each.
     Name them for what work happens there, not what file type they contain.
     Good: /drafting, /research, /production, /client-comms
     Bad: /documents, /files, /misc -->

- `/workspaces/[workspace-a]` — [what this workspace is for]
- `/workspaces/[workspace-b]` — [what this workspace is for]
- `/workspaces/[workspace-c]` — [what this workspace is for]

---

## Routing

<!-- What goes here: This is the most important section. Every task type the agent will do
     needs a row. When the agent gets a request, it checks this table to know:
     - Which workspace to work in
     - Which context files to load before starting
     - Which skill files to activate

     The routing table is a contract. Be exhaustive. If a task type isn't here,
     the agent has no map and will guess.

     Always read at minimum: one context/ file + the workspace's CONTEXT.md
     Only list a skill if that task genuinely needs it.

     If your project uses the memory layer (memory/ folder exists):
     - Add the session-start row at the top of your table
     - Add memory/index.md to the Read column for tasks where prior decisions/patterns are relevant -->

| Task Type | Workspace | Read | Load Skills |
|-----------|-----------|------|-------------|
| Session start — if memory/ exists | — | memory/index.md | memory-query.md |
| [task description] | /workspaces/[workspace-a] | context/project.md + [workspace-a]/CONTEXT.md | [skill.md or —] |
| [task description] | /workspaces/[workspace-b] | context/client.md + [workspace-b]/CONTEXT.md | [skill.md or —] |
| [task description] | /workspaces/[workspace-c] | context/project.md + [workspace-c]/CONTEXT.md | [skill.md or —] |

<!-- Remove the memory row if the project does not use the memory layer. -->

---

## Naming Conventions

<!-- What goes here: File naming rules for this project. Be specific enough that
     any file the agent creates is named correctly without asking.
     Examples below — replace with what actually applies to this project. -->

- Drafts: `topic-name_draft.md`
- Finals: `topic-name_final.md`
- Dated files: `YYYY-MM-DD-filename.md`
- [Any project-specific conventions]

---

## Behavioral Rules

<!-- What goes here: Standing instructions that apply across all work in this project.
     Rules the agent must always follow regardless of the task.
     Keep these short and specific. Generic rules ("be helpful") are noise.

     The memory rules at the bottom apply only if the project uses the memory layer.
     Remove them if memory/ does not exist in this project. -->

- Always read this file before beginning any task
- Load the relevant workspace CONTEXT.md before producing any output
- Do not create files outside designated workspace folders
- Ask before overwriting any file marked [FINAL]
- [Project-specific rule]
- [Project-specific rule]
- If memory/ exists: read memory/index.md before beginning any session
- If memory/ exists: run memory-write skill before closing any session where work was done

---

## Out of Bounds

<!-- What goes here: What the agent must never do without explicit instruction.
     Specific to this project's risks and sensitivities.
     Examples: "never send anything to the client without review",
     "never delete files", "never modify pricing without confirmation" -->

- [Action the agent must not take without explicit instruction]
- [Action the agent must not take without explicit instruction]
