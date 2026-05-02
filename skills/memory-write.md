---
name: memory-write
description: Write domain knowledge to the right destination at session end. Load when decisions were made, patterns confirmed, lessons learned, or open items need tracking across sessions.
---

# memory-write

## Purpose

Write project knowledge to the right place in the domain memory system at the end of a session. The goal is not to log everything — it's to capture what would be genuinely useful to the agent in a future session that has no access to today's conversation.

## When to Use

At the end of any session where:
- A decision was made that won't be obvious from the code or files alone
- A pattern was established or confirmed that should be repeated
- Something went wrong that should not be repeated
- A preference or constraint was learned about the project/client/team
- An open item needs to be tracked across sessions

If you only read and discussed without producing output or making decisions, memory-write is optional.

---

## Auto-Capture vs Manual Curation

The OpenClaw `domain-memory` plugin does not assume Pi-style lifecycle auto-capture. It provides explicit tools for writing durable observations. Treat automatic capture as optional future enhancement, not a guarantee.

**Explicit observation writes handle:** the "what" — factual records worth keeping.

**Manual curation still required for:** the "why" — context that can't be inferred from tool call logs:
- `#decision` entries: *why* something was chosen, *what was ruled out*, *what constraint drove it*
- `#lesson` entries: *what went wrong* and *what to do differently*
- `#preference` entries: *how the client/team wants things* that wasn't stated in a file
- `#pattern` entries: recurring approaches worth flagging explicitly for future sessions

Focus manual writes on `#decision`, `#lesson`, `#preference`, `#pattern`. Auto-capture handles the action log.

---

## The Two Destinations

### 1. MEMORY.md — Long-term, durable knowledge

**Write here when:** The information is true for the life of the domain or project, not just today.

**What belongs:**
- Decisions: why something was chosen, what was ruled out, what constraint drove it
- Patterns: approaches that work well for this domain/project specifically
- Preferences: how the client/team wants things done
- Lessons: what went wrong, what was fixed, what was non-obvious
- Known bugs: ongoing issues and their workarounds

**Format:**
```
[YYYY-MM-DD] #[tag] TYPE: [what] | REASONING: [why] | CONTEXT: [what triggered it]
status:[active|superseded] belongs_to:[domain|project-slug] related_to:[context/file.md, skill-name]
```

Required fields per entry:
- `#tag` — category: `#decision`, `#pattern`, `#preference`, `#lesson`, `#bug`, `#constraint`
- `status:` — `active` (default) or `superseded` (never delete; mark superseded and add a replacement entry)
- `belongs_to:` — `domain` for cross-project truths; `<project-slug>` for project-scoped entries promoted here

Optional but encouraged:
- `related_to:` — comma-separated pointers to context files, skills, or other entries that are connected. Makes entries navigable without a query tool.

**How to write to the curated file:**
```
Edit `MEMORY.md` directly when the entry is durable and human-readable.
```

**Marking an entry superseded:**
```
memory_write(
  file: "MEMORY.md",
  content: "<!-- [2026-01-15 entry above] status:superseded — replaced 2026-04-27, see new entry below -->"
)
```

---

### 2. Scratchpad — Active working items

**Write here when:** Something needs to be tracked across sessions but isn't yet done.

The scratchpad table in the domain DB is injected before every agent turn automatically.

**What belongs:**
- Open follow-ups the agent should remember
- Active tasks in flight
- Reminders that will become irrelevant once resolved

**Format:**
```
- [ ] [YYYY-MM-DD] [What to remember / do]
```

**How to write (via tool):**
```
observation_write(
  kind: "note",
  content: "Scratchpad: Follow up on client review of Section 4 draft",
  project: "my-project-slug"
)
```

Check off a completed item:
```
observation_write(
  kind: "log",
  content: "Completed scratchpad item: Follow up on client review of Section 4 draft",
  project: "my-project-slug"
)
```

---

## Session-End Checklist

Before closing any productive session:

- [ ] Did a decision get made? → Write `#decision` entry to MEMORY.md
- [ ] Was a pattern confirmed or established? → Write `#pattern` entry to MEMORY.md
- [ ] Did something go wrong that shouldn't repeat? → Write `#lesson` entry to MEMORY.md
- [ ] Was a preference or constraint learned? → Write `#preference` entry to MEMORY.md
- [ ] Are there open items for next session? → Add to scratchpad
- [ ] Are any scratchpad items now complete? → Mark them done

## What NOT to Write

- **Do not log everything.** Dense memory is harder to search than sparse memory.
- **Do not duplicate context/ files.** Project description, client profile, stack — don't copy them here.
- **Do not write process summaries.** "We had a productive session" is noise. What was decided is signal.
- **Do not write ephemeral details.** Debug traces and exact command outputs are usually noise unless a routing row or user asks to preserve them.
