# doc-authoring

## Purpose

Produce documentation that is specific, scannable, and complete. Every section earns its place. Every claim is concrete. The reader finishes knowing exactly what they need to know — not what was easy to write.

## When to Use

Load this skill when creating or updating:
- AGENTS.md files
- Workspace CONTEXT.md files
- Decision logs
- Project briefs and context files
- Reference documentation

Do not use for prose content (reports, proposals, social copy) — that's stop-slop territory.

---

## Process

### Step 1: Structure first

Before writing any content, define the sections. A document with the right sections and no content is more useful than content with no structure.

Ask: what does the reader need to do or decide after reading this? Structure backward from that.

For AGENTS.md: the reader needs to orient to the project and know where to start. Sections: what it is, where work lives, how to route tasks, rules.

For CONTEXT.md: the reader needs to know current state and how to work here. Sections: purpose, state (done/in-progress/queued), standards, active skills, references.

### Step 2: Lead with the answer

Each section opens with the actual information, not a preamble explaining what the section will cover.

Wrong: "This section covers the routing table, which is used to map task types to workspaces."
Right: "| Task Type | Workspace | Read | Load Skills |"

### Step 3: Be specific at every level

Generic content is noise. Every piece of information should be specific enough to act on.

- Generic: "Use the correct workspace for each task."
- Specific: "All estimate work goes in /workspaces/estimating. Do not create estimate files in /workspaces/client."

- Generic: "Update the context files regularly."
- Specific: "Update CONTEXT.md at the end of any session where work was done. Move completed items to Done. Update In Progress. Note blockers."

### Step 4: Every section earns its place

Before finalizing, check each section: if it disappeared, would anything break? If not, cut it.

A section that says "Be professional" or "Work efficiently" contributes nothing. A section that says "SMS messages to the client must be under 160 characters and confirm one action only" is load-bearing.

### Step 5: Tables over prose for structured information

Use tables for:
- Routing tables (task → workspace → context → skills)
- Stack definitions (layer → tool → notes)
- Decision logs (date → decision → reasoning → context)
- Any mapping with more than two fields

Use prose for:
- Sequential processes where order matters
- Explanations of why, not what
- Rules with conditional logic

---

## Standards

**No filler sections.** "Overview," "Introduction," "Summary" sections that don't add information beyond the title are noise. Cut them.

**Headers describe content, not categories.** "Tools Used" is better than "Tools." "Current Blockers" is better than "Blockers." The header should tell the reader what they're about to read, not just label it.

**Annotations must be specific.** When writing template files with instructions for how to fill them in, be concrete about what makes a good answer. "What goes here: a description of the project" is useless. "What goes here: one paragraph describing what the project produces, who it's for, and what done looks like — specific enough that someone unfamiliar with the project could accurately describe it after reading" is useful.

**Decisions go in decisions.md.** AGENTS.md and CONTEXT.md are not the right place for detailed rationale. Record the decision (one sentence), then add full reasoning to decisions.md. Keep working documents lean.

**Current state is always current.** CONTEXT.md files are the exception to "write once" documentation. They should change every session. A CONTEXT.md that hasn't been updated in two weeks is probably wrong.

---

## Common Mistakes

**Aspirational state.** Writing "In Progress: building the estimating module" for a module that's been done for a week. CONTEXT.md reflects reality, not plans.

**Instructions without standards.** Saying "write clearly" without defining what clear means. Replace with something the agent can apply: "sentences under 20 words," "one claim per bullet," "no jargon without definition."

**Redundant sections.** Having both a "Rules" section and a "Behavioral Rules" section covering the same content. Merge them.

**Missing routing coverage.** A routing table with three rows for a project that has eight task types. Gaps in the routing table mean the agent will guess. Guessing produces inconsistent work.

**Stale references.** Key References sections that link to files that have been renamed, moved, or deleted. Check references are live before finalizing.
