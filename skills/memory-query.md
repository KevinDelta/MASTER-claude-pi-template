---
name: memory-query
description: Surface relevant domain memory before doing work. Load at session start or when prior decisions and patterns are likely relevant to the current task.
---

# memory-query

## Purpose

Surface relevant context from the domain memory DB before doing work. `memory-db.ts` injects context before every agent turn automatically — but knowing what you're getting, how to ask for more, and when to read MEMORY.md directly makes the memory layer genuinely useful rather than invisible.

## When to Use

Load at session start. Also apply when:
- Starting a task where prior decisions or patterns are likely relevant
- Asked about something addressed in a previous session
- Writing something where prior learnings should inform the approach

---

## What memory-db.ts Gives You Automatically

Before every agent turn, `memory-db.ts` prepends to the system prompt (up to 16K tokens total):

1. **Open scratchpad items** — what's actively being tracked across projects
2. **FTS keyword search results** — observations from the domain DB matching your current prompt
3. **Vector search results** — semantically similar observations (requires ollama + nomic-embed-text)
4. **MEMORY.md content** — curated decisions, patterns, preferences (domain-level)

Auto-injection surfaces relevant memory without you asking. If something isn't appearing that should, use explicit retrieval below.

---

## Session Start — Full Orientation

At session start, read domain MEMORY.md directly for complete orientation. Auto-injection gives keyword-relevant slices; reading MEMORY.md gives the full picture of what the domain knows.

```
read("~/.pi/domain/<name>/MEMORY.md")
```

After reading, state what applies to today's work before proceeding:

> "From memory: #decision [[client-comms]] shows the client wants open questions in a numbered list at the top of deliverables. #pattern [[research-workflow]] shows two-pass research works best here. Applying both today."

This makes retrieval visible and auditable. If a memory is stale or wrong, correct it before it shapes the work.

---

## Explicit Search

When auto-injection isn't surfacing something expected — or when you need a specific past decision:

**FTS keyword search (fast, always available):**
The domain DB's FTS5 index is searched automatically before every turn. If you need to trigger it explicitly:
```
memory_db_search(query: "pricing exceptions client discount", mode: "fts")
```

**Vector/semantic search (requires ollama):**
```
memory_db_search(query: "how we approach out-of-scope requests", mode: "vector")
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
- Ignoring auto-injected context and re-reading everything manually (redundant)
- Never checking if auto-injection missed something relevant (blind trust in FTS)
- Reading full domain memory on every turn regardless of task type (wasteful)
