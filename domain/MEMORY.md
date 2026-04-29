---
domain: {{DOMAIN_NAME}}
scope: domain
established: {{ESTABLISHED_DATE}}
---

# Domain Memory — {{DOMAIN_NAME}}

<!-- This is the curated, human-readable companion to memory.db.
     The DB is the working substrate — full observation history, vector search, goals.
     This file is the index a human can read without a query tool.
     WHAT GOES HERE:
     - Cross-project decisions that apply at the domain level
     - Patterns confirmed across multiple projects (not one project's lesson)
     - Preferences and standards that hold across all work in this domain
     - Lessons that would change how the next project starts
     WHAT DOES NOT GO HERE:
     - Project-specific decisions (those live in <project-root>/context/decisions.md)
     - Active checklists (those live in the scratchpad table in memory.db)
     - Session logs (those live as observation rows in memory.db)
     ENTRY FORMAT:
     [YYYY-MM-DD] #tag TYPE: [what] | REASONING: [why] | CONTEXT: [what triggered it]
     status:[active|superseded] belongs_to:[domain|project-slug] related_to:[context/file.md, other-entry]
     Use #tags: #decision, #pattern, #preference, #lesson, #constraint
     Append-only — set status:superseded and note the replacement rather than deleting entries.
     ESTABLISHED: {{ESTABLISHED_DATE}} -->

---

## Domain Decisions

<!-- Architectural or methodological choices that apply across all projects in this domain.
     Format: [YYYY-MM-DD] DECISION: [what] | REASONING: [why] | CONTEXT: [what triggered it]
     Only write when a direction was chosen over real alternatives. -->

<!-- Example:
[2026-01-15] #decision DECISION: All client deliverables use Google Docs, not PDFs | REASONING: clients can comment inline; version history is automatic | CONTEXT: Client asked to track changes on a delivered report, PDF workflow failed
status:active belongs_to:domain related_to:context/clients.md
-->

---

## Domain Patterns

<!-- Approaches that have been validated across multiple projects.
     Not theories — things that have actually worked.
     Format: [YYYY-MM-DD] PATTERN: [what] | EVIDENCE: [which projects confirmed it] -->

<!-- Example:
[2026-02-10] #pattern PATTERN: Start every strategy engagement with a stakeholder map before any analysis | EVIDENCE: WynDelta, Meridian, TechCo engagements — skipping this led to rework in all three
status:active belongs_to:domain related_to:skills/domain-status.md
-->

---

## Domain Preferences

<!-- Standards and preferences that hold across all work in this domain.
     How things are done here, regardless of client or project. -->

<!-- Example:
[2026-01-20] #preference PREFERENCE: Executive summaries are always 3 bullets or fewer, never prose paragraphs | REASONING: decision-makers read bullets; prose gets skipped
status:active belongs_to:domain
-->

---

## Domain Lessons

<!-- Non-obvious lessons that would change how the next project starts.
     Format: [YYYY-MM-DD] LESSON: [what] | CONTEXT: [what prompted it] -->

<!-- Example:
[2026-03-05] #lesson LESSON: New project context files drafted from domain memory take 20 min vs 2 hrs from blank | CONTEXT: First time using domain-bootstrap skill on Acme project
status:active belongs_to:domain related_to:skills/domain-bootstrap.md
-->
