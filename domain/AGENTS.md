# AGENTS.md — {{DOMAIN_NAME}} (Domain Layer)

<!-- DOMAIN LAYER — install.sh appends this file to ~/.openclaw/workspaces/<domain>/AGENTS.md after the global section.
     OpenClaw treats that workspace as the domain agent's memory and instruction surface.
     Load model: ~/.openclaw/workspaces/<domain>/AGENTS.md (global+domain combined)
     -> project (<project-root>/AGENTS.md) when project work is routed.
     WHAT BELONGS HERE:
     - Domain vocabulary and methods shared across all projects in this domain
     - Routing table scaffold — rows that are true for every project in this domain
     - Work-routing requirements for heartbeat and channel-originated turns
     - Domain-wide rules and constraints beyond the global layer
     - Workspace template descriptions (structures projects inherit)
     WHAT DOES NOT BELONG HERE:
     - Global org standards (those live in the global section above this one)
     - Project-specific routing, workspaces, or rules (those live in <project-root>/AGENTS.md)
     - Client-specific preferences (those live in <project-root>/context/client.md)
     - OpenClaw channel/account/peer bindings (those live in OpenClaw config)
     HOW OVERRIDES WORK:
     - Routing rows are matched by the Task Type column's first keyword
     - A project routing row with the same Task Type key overrides the domain row
     - Domain rows that projects do not override apply as-is
     Fill in all sections. Delete all annotation comments when done. -->

---

## Domain Identity

<!-- One paragraph. What domain this is, for whom, what kind of work it covers.
     This establishes the domain-level identity that every project in this domain inherits
     on top of the global org identity.
     Example: "This domain covers go-to-market strategy and execution consulting for B2B SaaS
     companies. Work ranges from positioning and ICP definition to sales playbook development
     and channel strategy. Every project produces actionable client deliverables — not
     research reports." -->

[One paragraph describing the domain, its work, and what every project here produces]

---

## Domain Vocabulary

<!-- Terms specific to this domain that the agent needs before reading any project context.
     Fill in terms unique to your domain — industry jargon, methodology names, abbreviations.
     Generic terms (e.g., "stakeholder") do not need entries. -->

| Term | Definition |
|------|-----------|
| [term] | [what it means in this domain's context] |
| [term] | [what it means in this domain's context] |

---

## Domain Methods

<!-- How work is approached in this domain. Not project steps — domain-level methodology.
     These are the non-negotiable approaches that apply across all projects here. -->

- [Method: what it is and why it applies to all projects in this domain]
- [Method: what it is and why it applies to all projects in this domain]

---

## Domain Routing Table

<!-- Routing rows that apply to all projects in this domain unless overridden.
     Projects override rows by matching the Task Type column's first keyword.
     Add rows for task types that are universal to this domain's work.

     ROUTING BOUNDARY:
     - OpenClaw native routing decides which agent/workspace/session receives a message.
     - This table decides what the selected agent reads, which workspace it uses,
       and which skills/tools apply to the work.
     Do not encode channel/account/peer bindings here. Put those in OpenClaw config.

     Every entrypoint resolves through this table before acting:
     - direct openclaw agent turns
     - channel-routed turns after OpenClaw has selected this agent
     - heartbeat turns
     - project-scoped turns
     Domain-level memory lives in ~/.openclaw/workspaces/{{DOMAIN_NAME}}/MEMORY.md and memory.db -->

| Task Type | Workspace | Read | Load Skills |
|-----------|-----------|------|-------------|
| **Session start** — orient before any work | — | `MEMORY.md` + `HEARTBEAT.md` when recurring | `memory-query.md` |
| **Heartbeat** — recurring proactive check | — | `HEARTBEAT.md` + `MEMORY.md` | `memory-query.md` + `domain-status.md` |
| **Domain status** — cross-project summary, weekly review | — | `MEMORY.md` | `domain-status.md` |
| **Goal review** — check domain goals against observed state | — | `MEMORY.md` + `HEARTBEAT.md` | `goals-resolver.md` |
| **Session end** — update state and write memory | — | — | `memory-write.md` + `context-update.md` |
| **Harness** — modify AGENTS.md, skills, plugins, OpenClaw config | — | `BLUEPRINT.md` | `harness-dev.md` |

<!-- EXTENDING THIS TABLE IN PROJECTS:
     If a project needs a different session-start row, add one in the project AGENTS.md
     with the same "Session start" key. The project row overrides this one.
     Domain rows without a project override apply unchanged. -->

---

## Domain Workspace Templates

<!-- Common workspace structures used across this domain's projects.
     These are starting points — projects rename and customize as needed.
     Reference these when scaffolding a new project. -->

- `/workspaces/research` — background research, source synthesis, brief production
- `/workspaces/drafting` — deliverable drafts from first version through final
- `/workspaces/analysis` — data analysis, pattern synthesis, findings production
- `/workspaces/delivery` — final deliverables, client-ready assets, sent materials

<!-- Add, remove, or rename workspace templates based on this domain's actual work types. -->

---

## Domain-Wide Rules

<!-- Rules specific to this domain that apply across all projects.
     Global rules already apply — do not repeat them here.
     Only include rules that are unique to this domain's work. -->

- [Domain-specific rule — true for all projects in this domain]
- [Domain-specific rule — true for all projects in this domain]

---

## Routed Skills

<!-- Domain-level skills are loaded from ~/.openclaw/workspaces/{{DOMAIN_NAME}}/skills/*.md
     Universal/project skills are exposed by OpenClaw skill configuration.
     This table does not perform discovery; it documents when routing rows should use each skill.
     Add rows as domain-specific skills are created. -->

| Skill | When It Loads |
|-------|--------------|
| `domain-status.md` | Weekly reviews, cross-project summaries, domain health checks |
| `goals-resolver.md` | Heartbeat goal reviews; comparing observed state to declared goals |
| `[domain-skill].md` | [When to load it] |

---

## Out of Bounds

<!-- Hard stops at the domain level. Enforced by OpenClaw/host permissions when configured.
     These extend (not replace) global out-of-bounds. -->

- Never share materials from one project directory with another project without explicit confirmation
- Never modify memory.db schema directly — use the domain-memory plugin's provided tools
- Never bypass the routing table for heartbeat, channel, or project work
- [Domain-specific hard stop]
