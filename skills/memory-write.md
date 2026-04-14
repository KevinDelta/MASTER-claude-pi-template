---
name: memory-write
description: Write project knowledge to the right pi-memory destination at session end. Load when decisions were made, patterns confirmed, lessons learned, or open items need tracking across sessions.
---

# memory-write

## Purpose

Write project knowledge to the right place in pi-memory at the end of a session. The goal is not to log everything — it's to capture what would be genuinely useful to the agent in a future session that has no access to today's conversation.

## When to Use

At the end of any session where:
- A decision was made that won't be obvious from the code or files alone
- A pattern was established or confirmed that should be repeated
- Something went wrong that should not be repeated
- A preference or constraint was learned about the project/client/team
- An open item needs to be tracked across sessions

If you only read and discussed without producing output or making decisions, memory-write is optional.

---

## The Three Destinations

### 1. MEMORY.md — Long-term, durable knowledge

**Write here when:** The information is true for the life of the project, not just today.

**What belongs:**
- Decisions: why something was chosen, what was ruled out, what constraint drove it
- Patterns: approaches that work well for this project specifically
- Preferences: how the client/team wants things done
- Lessons: what went wrong, what was fixed, what was non-obvious
- Known bugs: ongoing issues and their workarounds

**Format:**
```
#[tag] [[topic-link]] [Title or summary — one line]
[1-3 sentences of specifics: what, why, what was ruled out / what to avoid]
```

Tag vocabulary:
- `#decision` — architectural, process, or tool choices
- `#pattern` — recurring approaches that work
- `#preference` — client/team style preferences
- `#lesson` — something learned the hard way
- `#bug` — known issue or active workaround

**How to write (via tool):**
```
memory_write(
  file: "MEMORY.md",
  content: "#decision [[database]] Chose SQLite for local dev, PostgreSQL for prod.\nMismatch between envs was causing false test failures. Now parity across both."
)
```

---

### 2. daily/YYYY-MM-DD.md — Session log

**Write here when:** Recording what was actually done this session.

**What belongs:**
- What work was completed
- What was researched or discovered
- What was decided (brief — full context goes in MEMORY.md)
- What's left open for next session

**Format:**
```
<!-- YYYY-MM-DD HH:MM:SS [sessionId] -->
#session [Brief title of what this session covered]
- [What was done]
- [What was decided — reference [[topic]] if also adding to MEMORY.md]
- [What's still open]
```

**Pi-memory creates and appends to the daily file automatically** during context compaction (handoff). Write manually for explicit session closure:

```
memory_write(
  file: "daily/2026-04-10.md",
  content: "<!-- 2026-04-10 17:30:00 -->\n#session Onboarding doc first draft\n- Completed sections 1-3\n- Decided to use numbered steps throughout [[client-prefs]]\n- Section 4 (tool setup) still pending"
)
```

---

### 3. SCRATCHPAD.md — Active working items

**Write here when:** Something needs to be tracked across sessions but isn't yet done.

**What belongs:**
- Open follow-ups the agent should remember
- Active tasks in flight
- Reminders that will become irrelevant once resolved

**Format:**
```
- [ ] [YYYY-MM-DD] [What to remember / do]
```

Check off completed items with `- [x]`. Pi-memory stops injecting checked items automatically.

**How to write (via tool):**
```
scratchpad(
  action: "add",
  item: "Follow up on client review of Section 4 draft"
)
```

Check off a completed item:
```
scratchpad(
  action: "complete",
  item: "Follow up on client review of Section 4 draft"
)
```

---

## Session-End Checklist

Before closing any productive session:

- [ ] Did a decision get made? → Write `#decision` entry to MEMORY.md
- [ ] Was a pattern confirmed or established? → Write `#pattern` entry to MEMORY.md
- [ ] Did something go wrong that shouldn't repeat? → Write `#lesson` entry to MEMORY.md
- [ ] Was a preference or constraint learned? → Write `#preference` entry to MEMORY.md
- [ ] Did work get done? → Write session summary to `daily/YYYY-MM-DD.md`
- [ ] Are there open items for next session? → Add to SCRATCHPAD.md
- [ ] Are any scratchpad items now complete? → Check them off

## What NOT to Write

- **Do not log everything.** Dense memory is harder to search than sparse memory.
- **Do not duplicate context/ files.** Project description, client profile, stack — don't copy them here.
- **Do not write process summaries.** "We had a productive session" is noise. What was decided is signal.
- **Do not write ephemeral details.** Debug traces, exact command outputs — daily log at most, never MEMORY.md.
