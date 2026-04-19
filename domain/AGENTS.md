# AGENTS.md — {{DOMAIN_NAME}} (Domain Layer)

<!-- DOMAIN LAYER — deploys to ~/.pi/domain/{{DOMAIN_NAME}}/AGENTS.md
     Pi load order: global (~/.pi/agent/AGENTS.md) → THIS FILE → project (<project-root>/AGENTS.md)
     Each layer appends and overrides the one above.
     WHAT BELONGS HERE:
     - Domain vocabulary and methods shared across all projects in this domain
     - Routing table scaffold — rows that are true for every project in this domain
     - Domain-wide rules and constraints beyond the global layer
     - Workspace template descriptions (structures projects inherit)
     WHAT DOES NOT BELONG HERE:
     - Global org standards (those live in ~/.pi/agent/AGENTS.md)
     - Project-specific routing, workspaces, or rules (those live in <project-root>/AGENTS.md)
     - Client-specific preferences (those live in <project-root>/context/client.md)
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
     Domain session-start reads domain-level memory. Projects extend or override this.
     Domain-level memory lives in ~/.pi/domain/{{DOMAIN_NAME}}/MEMORY.md and memory.db -->

| Task Type | Workspace | Read | Load Skills |
|-----------|-----------|------|-------------|
| **Session start** — orient before any work | — | `~/.pi/domain/{{DOMAIN_NAME}}/MEMORY.md` | `memory-query.md` |
| **Domain status** — cross-project summary, weekly review | — | `~/.pi/domain/{{DOMAIN_NAME}}/MEMORY.md` | `domain-status.md` |
| **Goal review** — check domain goals against observed state | — | `~/.pi/domain/{{DOMAIN_NAME}}/MEMORY.md` | `goals-resolver.md` |
| **Session end** — update state and write memory | — | — | `memory-write.md` + `context-update.md` |
| **Harness** — modify AGENTS.md, skills, extensions, settings | — | `BLUEPRINT.md` | `harness-dev.md` |

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

## Skills Available

<!-- Domain-level skills are auto-discovered from ~/.pi/domain/{{DOMAIN_NAME}}/skills/*.md
     Universal skills are auto-discovered from the project's skills/ directory.
     Routing table determines when each loads.
     Add rows as domain-specific skills are created. -->

| Skill | When It Loads |
|-------|--------------|
| `domain-status.md` | Weekly reviews, cross-project summaries, domain health checks |
| `goals-resolver.md` | Goal-referenced watches; comparing observed state to declared goals |
| `[domain-skill].md` | [When to load it] |

---

## Out of Bounds

<!-- Hard stops at the domain level. Enforced by permissions-config.json when
     pi-permission-system is installed. These extend (not replace) global out-of-bounds. -->

- Never share materials from one project directory with another project without explicit confirmation
- Never modify memory.db schema directly — use the memory-db extension's provided functions
- [Domain-specific hard stop]
