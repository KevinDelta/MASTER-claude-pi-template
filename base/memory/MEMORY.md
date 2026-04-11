# Long-Term Memory — [Project Name]

<!-- What goes here: Curated, durable knowledge about this project that should survive
     across sessions indefinitely. Decisions, patterns, preferences, lessons learned.

     This file is auto-injected by pi-memory before every agent turn (up to 4K chars).
     BM25 keyword search surfaces relevant entries based on the current prompt.

     CONTENT FORMAT:
     - Use #tags to categorize entries (searchable by pi-memory)
     - Use [[wiki-links]] to cross-reference related topics
     - One entry per paragraph or bullet block — don't merge unrelated facts
     - Keep entries specific. "Chose PostgreSQL" is weaker than the example below.

     WHAT BELONGS HERE vs DAILY LOG vs SCRATCHPAD:
     - MEMORY.md: decisions, preferences, patterns, lessons — things true for the life of the project
     - daily/: what happened in a session — time-stamped, append-only
     - SCRATCHPAD.md: open items actively being tracked right now

     DELETE THESE ANNOTATIONS before going live. Keep only real memory entries. -->

---

## Decisions

<!-- #decision entries: architectural choices, tool selections, process decisions.
     Format: why it was chosen, what was ruled out, key constraint.
     These are the most valuable entries — they prevent relitigating past decisions. -->

<!-- Example:
#decision [[tech-stack]] Chose PostgreSQL for all data storage.
Evaluated MySQL (ruled out: less mature JSON support) and MongoDB (ruled out: team familiarity).
Constraint: must support JSONB queries for the event log schema.
-->

## Preferences

<!-- #preference entries: how this project/client/team wants things done.
     Communication style, formatting choices, workflow quirks. -->

<!-- Example:
#preference [[output-format]] All deliverables export as Google Docs via Drive API, not Markdown.
Client reviews in Drive. Never send raw .md files.
-->

## Patterns

<!-- #pattern entries: recurring approaches that work well for this project.
     What to repeat. What the team/client responds well to. -->

<!-- Example:
#pattern [[research-workflow]] Research sessions work best as two passes:
first pass collects raw sources with no filtering,
second pass synthesizes into the brief format. Skipping to synthesis too early misses edge cases.
-->

## Lessons

<!-- #lesson entries: things that went wrong, were fixed, or were non-obvious.
     What to avoid repeating. What was discovered the hard way. -->

<!-- Example:
#lesson [[client-comms]] Client X wants all open questions flagged in a numbered list
at the top of any deliverable — not inline. Learned on the Q3 brief review call.
-->

## Bugs / Known Issues

<!-- #bug entries: known issues, broken things, workarounds in use. -->

<!-- Example:
#bug [[export-pipeline]] PDF export from the CMS drops inline code blocks.
Workaround: convert to HTML first, then export. Filed with vendor 2026-03-15.
-->
