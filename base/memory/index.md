# Memory Index

<!-- What goes here: This is the FIRST file the agent reads at the start of every session
     when the memory layer is active. It is the navigation hub for everything in memory/.
     The agent reads this once to know what exists, then pulls specific pages as needed.
     Never read every memory file — read this index, then pull only what's relevant.

     Keep this file current. Every time a new topic page is created, add a row.
     Every time a session ends, add a line to Recent Sessions.
     This is a living document. If it's stale, the memory layer doesn't work. -->

---

## Knowledge Pages

<!-- What goes here: One row per topic page in this memory/ folder.
     The Summary column should be specific enough that the agent knows whether
     to read that page for a given task — without reading the page itself.
     Update Last Updated when the page changes. -->

| Page | Summary | Last Updated |
|------|---------|--------------|
| `example-topic.md` | [Delete this row — replace with actual topics] | [YYYY-MM-DD] |

<!-- Example rows (delete when replacing with real content):
| `pricing.md` | Decisions on pricing strategy, discount thresholds, client-specific exceptions | 2026-03-15 |
| `client-acme.md` | ACME Corp: preferences, what works, what doesn't, key contacts | 2026-04-01 |
| `technical-decisions.md` | Stack choices, architecture decisions, what was ruled out and why | 2026-02-28 |
| `patterns.md` | Recurring patterns observed — what the client responds to, what falls flat | 2026-04-08 |
-->

---

## Recent Sessions

<!-- What goes here: Last 5–10 session summaries. One line each.
     Format: [YYYY-MM-DD] What was done — what was decided — what's next.
     Keep this pruned to the most recent 10. Older sessions live in log.md.
     This block lets the agent orient instantly without grepping log.md. -->

- [YYYY-MM-DD] [Session summary — what was done, what was decided, where things stand]

<!-- Example:
- [2026-04-10] Finalized pricing model for retainer tier — decision logged. Started client onboarding doc.
- [2026-04-08] Research session on competitor positioning. Created patterns.md.
- [2026-04-05] Initial memory setup. Created index.md and log.md.
-->

---

## How to Use This Memory Layer

<!-- Keep this block. It tells the agent how to navigate memory.
     Edit the grep commands if your log format changes. -->

**Session start:** Read this file. Check Recent Sessions. Pull relevant topic pages for today's task.

**Session end:** Use `memory-write` skill. Update Recent Sessions here. Add any new topic pages to the table.

**Finding past entries in log.md:**
- Last 10 entries: `grep "^## \[" memory/log.md | tail -10`
- By type: `grep "^## \[" memory/log.md | grep "decision"`
- By topic: `grep -A5 "decision | pricing" memory/log.md`
- By month: `grep "^## \[2026-04" memory/log.md`
