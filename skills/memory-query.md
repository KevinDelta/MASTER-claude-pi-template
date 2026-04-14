---
name: memory-query
description: Surface relevant project memory before doing work. Load at session start when memory/ exists, or when prior decisions and patterns are likely relevant to the current task.
---

# memory-query

## Purpose

Surface relevant project memory before doing work. Pi-memory auto-injects context before every agent turn — but knowing what you're getting, how to ask for more, and when to read MEMORY.md directly makes the memory layer genuinely useful rather than invisible.

## When to Use

Load this skill at session start when memory/ exists in the project. Also apply when:
- Starting a task where prior decisions or patterns are likely relevant
- Asked about something that may have been addressed in a previous session
- Writing something where prior learnings should inform the approach

---

## What Pi-Memory Gives You Automatically

Before every agent turn, pi-memory prepends to the system prompt (up to 16K chars total):

1. **Open scratchpad items** (2K) — what's actively being tracked
2. **Today's daily log tail** (3K) — what happened in this session so far
3. **BM25 search results** (2.5K) — entries from MEMORY.md + daily logs relevant to your current prompt
4. **MEMORY.md long-term content** (4K) — curated decisions, patterns, preferences
5. **Yesterday's daily log** (3K) — lowest priority, trimmed first if space runs out

This means relevant memory surfaces without you asking. But auto-injection has limits — it's BM25 keyword search, not full recall. If something isn't surfacing that should be, use explicit retrieval below.

---

## Session Start — Explicit Orientation

At session start, read MEMORY.md directly for full project orientation. Auto-injection gives you keyword-relevant slices; reading MEMORY.md gives you the complete picture of what the project knows.

```
read("memory/MEMORY.md")
```

After reading, state what's relevant to today's work before proceeding:

> "From memory: #decision [[client-comms]] shows the client wants open questions in a numbered list at the top of deliverables. #pattern [[research-workflow]] shows two-pass research works best for this project. Applying both today."

This makes the memory retrieval visible and auditable. If a memory is stale or wrong, it can be corrected before it shapes the work.

---

## Explicit Search

When auto-injection isn't surfacing something you expect — or when you need to find a specific past decision:

**Keyword search (fast, ~30ms):**
```
memory_search(query: "pricing exceptions client discount", mode: "keyword")
```

**Semantic search (deeper, requires qmd):**
```
memory_search(query: "how we handle client requests outside scope", mode: "semantic")
```

**Read a daily log directly:**
```
read("memory/daily/2026-04-08.md")
```

**Scan recent daily logs:**
```bash
ls memory/daily/ | sort | tail -5
```

---

## How to Surface Memory Into Context

After reading or searching memory, explicitly state what applies before producing output. Don't assume it was absorbed.

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

- Reading all daily logs every session regardless of relevance (wasteful)
- Consulting memory for things already in context/ files (don't duplicate reads)
- Ignoring auto-injected context and re-reading everything manually (redundant)
- Never checking if auto-injection missed something relevant (blind trust in BM25)
