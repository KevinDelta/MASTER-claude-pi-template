# Pi Agent Harness — [Project Name]

<!-- This file configures how the Pi agent operates inside this project.
     AGENTS.md is about the project. PI.md is about the agent running inside it.
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

Pi.dev provides four built-in tools — always available, no configuration needed:

- `read` — read any file within scope
- `write` — create new files
- `edit` — modify existing files
- `bash` — execute shell commands

---

## Project-Specific Tools

<!-- What goes here: Any additional tools, integrations, or MCP servers
     configured specifically for this project. If none, write "None."
     Examples: a database query tool, a CMS API, a calendar integration. -->

- [Tool name] — [what it's used for in this project]
- [Tool name] — [what it's used for in this project]

---

## System Prompt Configuration

Pi loads system prompt files automatically. This project uses:

| File | Role |
|------|------|
| `APPEND_SYSTEM.md` | Extends pi's default system prompt with project-specific tone and context |
| `SOUL.md` | Persona and communication style (delete if not applicable) |

`SYSTEM.md` is available as an alternative to `APPEND_SYSTEM.md` — it replaces pi's default entirely. Use only if you need full control over the system prompt. For most projects, `APPEND_SYSTEM.md` is the right choice.

---

## Skills Index

<!-- Every skill file in this project's skills/ folder, and the condition
     under which the routing table in AGENTS.md loads it.
     This is a declaration, not a decision — the routing table decides when to load. -->

| Skill File | Load When |
|------------|-----------|
| `skills/stop-slop.md` | Writing or editing any prose output |
| `skills/doc-authoring.md` | Creating or updating documentation files |
| `skills/context-update.md` | Updating a workspace CONTEXT.md after a session |
| `skills/memory-query.md` | Session start |
| `skills/memory-write.md` | Session end, after any productive session |
| `skills/[domain-skill].md` | [condition] |

---

## Memory Setup

This project uses **pi-memory** for persistent cross-session memory.

**Install the extension:**
```bash
pi install npm:pi-memory
```

**Memory files are stored at:** `memory/` (project-relative, configured in `.pi/settings.json`)

**Optional: enable semantic search with qmd**
```bash
# Install qmd (requires Bun)
bun install -g https://github.com/tobi/qmd

# Index memory on first use
qmd collection add ./memory --name pi-memory
qmd context add /daily "Daily append-only work logs organized by date" -c pi-memory
qmd context add / "Curated long-term memory: decisions, preferences, facts, lessons" -c pi-memory
qmd embed
```

Without qmd, pi-memory uses BM25 keyword search (~30ms) — fast and effective for most projects.

---

## Behavioral Guardrails

<!-- Hard constraints on how the agent operates, independent of task.
     These govern process, not content. -->

- Read AGENTS.md at the start of every session
- Load the workspace CONTEXT.md before producing any output in that workspace
- Append `_draft` to all work files until explicitly finalized
- Surface ambiguity before proceeding — do not assume
- Update workspace CONTEXT.md at the end of any session where work was done
- Write to memory (MEMORY.md or daily log) before closing any productive session
- [Project-specific constraint]

---

## Output Defaults

<!-- Default format and file conventions for this project.
     These apply unless the task specifies otherwise. -->

- Format: Markdown unless specified
- File naming: follow AGENTS.md conventions
- Draft indicator: `_draft` suffix until marked [FINAL]
- [Any project-specific output default]

---

## Future Capabilities

**pi-teams** (multi-agent): Pi supports spawning multiple autonomous Teammate agents that communicate and share a task board. Use for parallelizing large workstreams across terminal panes. Not configured by default — add when team-scale coordination is needed.

See: `npm install pi-teams` and `github.com/burggraf/pi-teams`
