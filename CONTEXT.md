# CONTEXT.md — MASTER-claude-pi-template

> Domain glossary and architectural overview for this repo. Engineering skills read this before exploring the codebase. Fill in terms and concepts as they crystallise — use `/grill-with-docs` to drive this lazily from real decisions.

## What this repo is

A template system for building portable, domain-scoped knowledge worker agents on OpenClaw. The installer scaffolds an OpenClaw workspace with a routing table, domain persona, heartbeat tasks, memory, and project structure.

## Glossary

| Term | Definition |
|------|-----------|
| **OpenClaw** | The agent runtime and control plane. Manages agents, channels, identity, heartbeat, auth, and routing to isolated workspaces. |
| **Workspace** | `~/.openclaw/workspace/` — the single git-tracked directory where domain brain files and all project work live. |
| **SOUL.md** | Persona definition file. Describes the agent's identity, domain expertise, voice, and operating principles. |
| **AGENTS.md** | Routing table. Every turn, channel route, heartbeat, and project workflow resolves through a row here before work begins. |
| **HEARTBEAT.md** | Recurring task definitions. Owned by OpenClaw heartbeat. |
| **DOCK.md** | Export policy. Defines what the agent carries between sessions and what it can share externally. |
| **Domain** | A named scope of expertise installed via `./install.sh --domain <name>`. Appends routing + identity layers on top of OpenClaw's global config. |
| **Project** | A sub-scope within a domain, created via `--project-slug <name>`. Lives at `workspace/projects/<slug>/`. |
| **Intake** | The onboarding data contract (`master.json`) collected by the HTML wizard and consumed by `install.sh`. |
| **Routing row** | A single entry in `AGENTS.md` that maps an intent or channel to an agent and skill. |
| **Skill** | A reusable workflow or behavior modifier (e.g. `stop-slop.md`, `memory-write.md`). Describes *how* to do something — skills do not own output format. Shipped by the `domain-skills` plugin (core + per-domain tiers); discovered at runtime via `list_skills` and loaded by routing rows naming the file in `Load Skills`. |
| **`domain-skills` plugin** | OpenClaw plugin that owns the skill library. Ships universal skills under `core/` and domain-specific skills under `domains/<name>/`. Registers `list_skills`, `read_skill`, `install_skill`, and `remove_skill` MCP tools. Vendoring of third-party skills (e.g. Anthropic-marketplace `pdf`, `docx`) goes through `install_skill`, which wraps `openskills` with `--no-sync` to avoid mutating AGENTS.md. |
| **Skill tier** | A subdir inside the `domain-skills` plugin signalling scope. `core/` = universal (loaded for every install). `domains/<name>/` = domain-specific (loaded only when `--domain <name>` is selected). Resolution order is `core` → `domain` → `vendor` → `user` (last wins), so a user skill can shadow a vendored or plugin skill by reusing the filename. |
| **Vendor skill** | A skill installed into `~/.openclaw/workspace/skills/vendor/` via `install_skill` (which shells out to `openskills`). Distinct from plugin skills (shipped with the template) and user skills (hand-authored in the workspace). |
| **Template** | A reusable output shell (e.g. `executive-brief.md`, `weekly-status.md`). Describes the *shape* a deliverable takes. Skills fill templates; one template can be filled by many skills. Distinct from `skill` — skills are process, templates are shape. |
| **Inbox** | Human-curated staging area for raw upstream artifacts (call transcripts, meeting notes, clipped articles, voice memos). Lives at `base/inbox/` (project-scoped) and `domain/inbox/` (cross-project). Files land in `_inbox/`, get distilled via a routing row with human confirmation, then move to `_processed/`. **Distinct from memory** — inbox is the human's feed-in surface; memory is the agent's own observation store. Distillation never auto-writes to memory; the human decides what crosses that boundary. |
| **Distill** | The deliberate, human-triggered act of processing an inbox item — extracting insights and proposing where they belong (pillar/skill/decision/memory edit), then archiving the source. Always gated by user confirmation. |

## What to avoid

- Don't call the routing table a "config file" — it's a **routing table**
- Don't call SOUL.md a "system prompt" — it's a **persona definition**
- Don't call the template a "framework" — it's a **template system**
