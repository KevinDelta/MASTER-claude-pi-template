---
name: memory-query
description: Surface relevant domain memory before doing work. Load at session start or when prior decisions and patterns are likely relevant to the current task.
---

# memory-query

## Purpose

Surface relevant context from the domain memory DB before doing work. The OpenClaw `domain-memory` plugin exposes explicit memory tools; use them deliberately from routing rows instead of assuming invisible lifecycle injection.

## When to Use

Load at session start. Also apply when:
- Starting a task where prior decisions or patterns are likely relevant
- Asked about something addressed in a previous session
- Writing something where prior learnings should inform the approach

---

## What the domain-memory Plugin Gives You

Use explicit tools:

1. `domain_memory_query` - FTS + vector search over bounded, redacted observation excerpts
2. `scratchpad_list` - open cross-session items
3. `domain_status` - project activity and aggregate memory health
4. `memory_maintenance` - heartbeat embedding backfill and health checks

This makes recall visible and auditable. Do not pretend memory was injected if you did not query or read it.

---

## Session Start — Full Orientation

At session start, read domain MEMORY.md directly for complete orientation. Plugin search gives keyword-relevant slices; reading MEMORY.md gives the full picture of what the domain knows.

```
read("~/.openclaw/workspace/MEMORY.md")
```

After reading, state what applies to today's work before proceeding:

> "From memory: #decision [[client-comms]] shows the client wants open questions in a numbered list at the top of deliverables. #pattern [[research-workflow]] shows two-pass research works best here. Applying both today."

This makes retrieval visible and auditable. If a memory is stale or wrong, correct it before it shapes the work.

---

## Explicit Search

When you need a specific past decision or pattern:

**FTS/vector search through the plugin:**
```
domain_memory_query(query: "pricing exceptions client discount")
```

**Semantic query (uses vector search when ollama is available):**
```
domain_memory_query(query: "how we approach out-of-scope requests")
```

**Read a specific project's observation log:**
Check the domain MEMORY.md for cross-project patterns first. For project-specific detail, read context files:
```
read("context/project.md")
read("context/decisions.md")
```

---

## How to Surface Memory Into Context

After reading or searching, explicitly state what applies before producing output. Don't assume it was absorbed.

**Before writing a client deliverable:**
> "From memory: #preference [[output-format]] shows all deliverables go to Drive, not Markdown. #lesson [[client-comms]] shows questions go in a numbered list at the top. Applying both."

**Before making a technical recommendation:**
> "From memory: #decision [[tech-stack]] shows we chose PostgreSQL and ruled out MongoDB. Recommending consistently with that."

**Before starting a research task:**
> "From memory: #pattern [[research-workflow]] shows two-pass research outperforms single-pass here. Using that approach."

This makes retrieval auditable. If a memory is wrong or outdated, state it and add a corrected `#lesson` entry via memory-write.

---

## When Memory Has Nothing Relevant

If MEMORY.md shows no applicable decisions or patterns for today's task: proceed. Don't force memory consultation when there's no prior history.

Expected for:
- Early project sessions (memory is sparse)
- New task types that haven't come up before
- Routine work with no accumulated project-specific context

---

## Signs Memory Is Being Misused

- Consulting memory for things already in context/ files (duplicate reads)
- Claiming memory was checked when no memory tool or file read was used
- Never checking whether explicit recall missed something relevant
- Reading full domain memory on every turn regardless of task type (wasteful)
