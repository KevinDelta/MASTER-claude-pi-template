# memory-query

## Purpose

Navigate the project memory layer efficiently before doing work. The memory layer exists to prevent re-deriving things that have already been figured out. This skill defines how to read memory without wasting context tokens on files that aren't relevant to the current task.

## When to Use

At the start of any session when memory/ exists in the project. Also load when:
- Starting a task that likely has prior decisions or patterns relevant to it
- Asked about something that may have been addressed in a previous session
- Writing something where prior learnings should inform the approach

---

## The Navigation Order

Always read in this order. Stop when you have enough to proceed.

### Step 1: Read index.md (always)

`memory/index.md` is the only file you read every session without filtering. It's small and gives you complete orientation: what topic pages exist, what they cover, and what happened in recent sessions.

After reading index.md, you know:
- Whether any topic pages are relevant to today's task
- What was decided or learned in recent sessions
- Where to find deep knowledge if needed

If index.md tells you nothing is relevant to today's task: proceed to work. Don't read more.

### Step 2: Pull relevant topic pages (if applicable)

If the index shows a topic page relevant to today's task, read it. Topic pages are consolidated knowledge — they're faster than grepping the log.

Examples of when to pull a topic page:
- Starting work that involves pricing → read `pricing.md`
- Writing anything client-facing → read `client-[name].md`
- Making a technical choice → read `technical-decisions.md`

Read only the pages that apply. Don't read all topic pages as a default.

### Step 3: Grep log.md for specific questions (when needed)

Use log.md grep when you have a specific question that the index and topic pages didn't answer: "What was the exact reasoning on the pricing exception we made last month?"

**Standard queries — run these in the project root:**

```bash
# What happened recently (last 10 entries)
grep "^## \[" memory/log.md | tail -10

# All decisions ever logged
grep "^## \[" memory/log.md | grep " decision "

# All learnings ever logged
grep "^## \[" memory/log.md | grep " learning "

# Decisions about a specific topic
grep -A8 "decision | pricing" memory/log.md

# Patterns logged
grep "^## \[" memory/log.md | grep " pattern "

# Everything from this month
grep "^## \[2026-04" memory/log.md

# Full entry for a specific date
grep -A10 "\[2026-04-08\]" memory/log.md
```

Read the matching entries. Don't read log.md linearly from the top — it's a grep target, not a document.

---

## How to Surface Memory Into Context

After reading memory, bring what's relevant into your working context explicitly before producing output. Don't assume memory was absorbed — state it.

**Before writing a proposal:**
> "From memory: pricing decisions say we use outcomes-first framing (2026-04-10). Client-acme.md shows they respond slowly to process descriptions. Applying both to this draft."

**Before making a technical recommendation:**
> "From memory: technical-decisions.md shows we ruled out DuckDB (too much tooling overhead). Railway Postgres is the confirmed pattern."

**Before starting a research task:**
> "From memory: the pattern logged 2026-04-10 shows irrigation jobs consistently run over on labor. This shapes what I'll look for in the competitive analysis."

This makes the memory retrieval visible and auditable. If a memory is wrong, it can be corrected.

---

## When Memory Has Nothing Relevant

If index.md shows no relevant topic pages and recent sessions don't touch today's task: proceed to work without reading further. Don't force memory consultation for tasks that have no prior history.

This is expected for:
- Early project sessions (memory is sparse)
- New task types that haven't come up before
- Projects with short lifespans that haven't accumulated much

---

## Signs Memory Is Being Misused

- Reading all topic pages every session regardless of task relevance (wasteful)
- Reading log.md linearly from the top (it's a grep target)
- Consulting memory for things already in context/ files (don't duplicate reads)
- Skipping index.md and going straight to grepping log.md (index gives you better orientation faster)
