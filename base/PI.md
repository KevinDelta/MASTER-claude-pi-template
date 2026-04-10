# Pi Agent Harness — [Project Name]

<!-- This file configures how the Pi agent operates inside this project.
     CLAUDE.md is about the project. PI.md is about the agent running inside it.
     Keep these two files separate. Do not merge their concerns. -->

---

## Scope

<!-- What goes here: Define the agent's operational boundary.
     What directory does it own? What is explicitly off-limits?
     Be precise. The agent should never need to guess where its sandbox ends. -->

This agent operates within `/[project-root]`.
It does not access files outside this directory without explicit instruction.

---

## Default Tools

<!-- What goes here: List the tools the Pi platform provides by default.
     You do not need to configure these — just document them so the agent
     knows what it has. Remove tools that aren't available in your setup. -->

- File read/write within project scope
- Web search
- [Pi platform default tool]
- [Pi platform default tool]

---

## Project-Specific Tools

<!-- What goes here: Any additional tools, integrations, or MCP servers
     configured specifically for this project. If none, write "None."
     Examples: a database query tool, a CMS API, a calendar integration. -->

- [Tool name] — [what it's used for in this project]
- [Tool name] — [what it's used for in this project]

---

## Skills Index

<!-- What goes here: Every skill file in this project's skills/ folder,
     and the condition under which the routing table loads it.
     This is a declaration, not a decision — the routing table in CLAUDE.md
     decides when to load each skill. This index just registers that they exist. -->

| Skill File | Load When |
|------------|-----------|
| `skills/stop-slop.md` | Writing or editing any prose output |
| `skills/doc-authoring.md` | Creating or updating documentation files |
| `skills/context-update.md` | Updating a workspace CONTEXT.md after a session |
| `skills/[domain-skill].md` | [condition] |

---

## Behavioral Guardrails

<!-- What goes here: Hard constraints on how the agent operates — independent of
     the specific task being worked on. These govern process, not content.
     Copy and modify the defaults below. Add project-specific constraints. -->

- Read CLAUDE.md at the start of every session
- Load the workspace CONTEXT.md before producing any output in that workspace
- Append `_draft` to all work files until explicitly finalized
- Surface ambiguity before proceeding — do not assume
- Update workspace CONTEXT.md at the end of any session where work was done
- [Project-specific constraint]

---

## Output Defaults

<!-- What goes here: Default format and file conventions for this project.
     These apply unless the task specifies otherwise. -->

- Format: Markdown unless specified
- File naming: follow CLAUDE.md conventions
- Draft indicator: `_draft` suffix until marked [FINAL]
- [Any project-specific output default]
