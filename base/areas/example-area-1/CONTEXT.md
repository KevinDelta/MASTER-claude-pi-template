# [Area Name] — Context

<!-- What goes here: The current state and operating model of this area.
     The agent reads this before doing any work here.

     SECTIONS AT A GLANCE:
     - Purpose         → what this area is and what it produces (stable)
     - Functions       → what operations happen here (stable — rarely changes)
     - Workflow        → the sequence work follows, step by step (stable — rarely changes)
     - Standards       → quality bar, format rules, hard constraints (stable — rarely changes)
     - Current State   → what's done / in progress / queued / blocked (volatile — update every session)
     - Skills Active   → which skills the routing table loads for this workspace (stable)
     - Key References  → files and resources to know about (update as project evolves)

     Update ONLY Current State at the end of each session.
     The other sections reflect how this area works — change them only when the process changes.

     Rename this file's header to match the actual area.
     Example: "# Drafting — Context" or "# Research — Context" -->

## Purpose

<!-- What is this area for? What does it produce?
     One or two sentences. Specific enough that the agent knows exactly what belongs here
     and what doesn't. The agent uses this to decide whether a task belongs in this area
     or somewhere else.

     Good: "Produces all client-facing deliverables — reports, proposals, and summaries —
     from research input to final formatted draft."
     Bad: "Where we write things." -->

[What this area is for and what it produces]

---

## Functions

<!-- What operations does this area handle? List the distinct types of work
     that happen here. Not a process — just the action vocabulary.
     4-6 bullets. Stable — update only when the area's scope changes.

     Good: specific operations with a clear input and output.
     Bad: "writing and editing" — too vague to be useful.

     Example (drafting area):
     - First draft from brief or research summary
     - Revision pass incorporating feedback
     - Self-edit for tone and slop before review
     - Final QA against brief and client standards
     - Formatting and packaging for delivery -->

- [Operation this area performs]
- [Operation this area performs]
- [Operation this area performs]
- [Operation this area performs]

---

## Workflow

<!-- The sequence work moves through this area, step by step.
     This is the process the agent should follow — not standards, not state.
     Numbered steps. Stable — update only when the process changes.

     Write it as: input → what happens → gate → next step.
     Include confirmation points and handoff conditions explicitly.
     If the agent doesn't know when to stop or what "done" means for a step, it will guess.

     Example (drafting area):
     1. Receive brief or research summary → confirm scope and word count before writing
     2. Produce outline → flag for review if deliverable is client-facing
     3. Draft to completion — do not stop mid-document to ask questions
     4. Self-edit using stop-slop skill — cut hollow openers, vague superlatives, padding
     5. Mark as Ready for Review in Current State → do not move to Done unilaterally
     6. Incorporate feedback → move to Done only after explicit sign-off -->

1. [First step — what triggers it and what the agent does]
2. [Second step — any gate or confirmation before proceeding]
3. [Third step]
4. [Completion condition — what "done" means for work in this area]

---

## Standards and Conventions

<!-- Hard rules specific to this area. Format requirements, quality bar,
     things to always or never do here.
     Do not repeat org-wide standards from AGENTS.md — only add what's specific to this area.

     Good: "All drafts stay in /areas/drafting/ until review sign-off — never move to /production/ unilaterally."
     Bad: "Be professional." -->

- [Standard specific to this area]
- [Standard specific to this area]
- [Standard specific to this area]

---

## Current State

<!-- The volatile section. Update this at the end of every session using context-update.md.
     Move items between lists as work progresses.
     Prune Done when it gets long — completed work lives in git history and daily logs. -->

**Done:**
- [Completed item]

**In Progress:**
- [Item currently being worked on — include where it is in the Workflow sequence]

**Queued:**
- [Item waiting to be started]
- [Item waiting to be started]

**Blocked:**
- [Item] — blocked by [what / who / what decision is needed]

---

## Skills Active Here

<!-- Skills the routing table loads when tasks point to this workspace.
     Should match the routing table row for this workspace exactly.
     If a skill is listed here but not in the routing table, it won't load automatically. -->

- `[skill-name].md` — [why it applies to work in this workspace]

---

## Key References

<!-- Files, docs, or external resources the agent should know about when working here.
     Update when new files are created that will be needed in future sessions.
     Check these are live paths — stale references waste context. -->

- [Reference] — [what it is and why it matters here]
- [Reference] — [what it is and why it matters here]

---

## Session Navigation

<!-- Use /tree to view and branch the conversation when parallel workstreams emerge mid-session.
     Label active branches with Shift+L to distinguish them by purpose.

     Common labeling pattern for this workspace:
     - "research"  → exploratory or information-gathering threads
     - "drafting"  → active writing or generation threads
     - "review"    → feedback and revision threads
     - "comms"     → client or stakeholder communication threads

     Branches are ephemeral — they do not affect CONTEXT.md or Current State.
     Only promote work to Current State when it is ready to be tracked as a real deliverable.
     Use double-escape to fork a session before a risky or exploratory move. -->
