---
name: context-update
description: Keep workspace CONTEXT.md files accurate after work sessions. Load at the end of any session where files were modified, decisions were made, or task state changed.
---

# context-update

## Purpose

Keep workspace CONTEXT.md files accurate and current after work sessions. A stale CONTEXT.md is a liability — it primes the agent with false state and wastes tokens correcting for it. This skill makes updating a consistent, low-friction habit.

## When to Use

At the end of any session where substantive work was done in a workspace. "Substantive" means: a file was created or modified, a decision was made, a task was completed, or a blocker was discovered.

If you only read files without producing output, a CONTEXT.md update is optional.

---

## Process

### 1. Check In Progress

Look at the "In Progress" list. For each item, ask: is this still in progress, or was it completed this session?

- If completed: move it to Done. Add today's date if useful.
- If still in progress: leave it. Update the description if the nature of the work changed.
- If abandoned or deprioritized: move it to Queued or remove it entirely.

### 2. Update Done

Move any completed items from In Progress to Done. Keep Done concise — it's a record, not a trophy case. When the Done list gets long (more than 10 items), prune the oldest entries. Completed work is preserved in the actual files; the Done list is for recent context only.

### 3. Update Queued

Add any new tasks that came up this session and haven't been started. Remove tasks that are no longer relevant. Reorder if priority shifted.

### 4. Update Blocked

Add any items that were discovered to be blocked. Note specifically what the block is — "blocked by [dependency / person / decision]" — so the next session doesn't have to rediscover it.

Remove items from Blocked if the block was resolved.

### 5. Update Functions (if needed)

If this session introduced a new type of operation that wasn't previously done in this workspace, add it to the Functions list. Do not add one-off tasks — only add operations that will recur. Functions are stable; update them rarely.

### 6. Update Workflow (if needed)

If the sequence of how work moves through this workspace changed — a new gate was added, a step was reordered, a completion condition was clarified — update the Workflow section. This is not a session log; only update it when the *process itself* changed, not when work progressed through the existing process.

### 7. Update Standards and Conventions (if needed)

If this session established a new format rule, quality bar, or hard constraint specific to this workspace, add it here. Only add standards when they're actually new — don't re-document things already listed.

### 8. Update Key References (if needed)

If new files were created that will be needed in future sessions, add them to Key References. If referenced files were renamed or moved, correct the links.

---

## Standards

**Always reflect reality.** The CONTEXT.md is not a plan — it's current state. If something isn't done, it doesn't go in Done. If something isn't blocked, it doesn't go in Blocked.

**Be specific in state descriptions.** "In Progress: estimate module" is weaker than "In Progress: estimate module — scoring logic complete, SMS alert not yet wired." The more specific, the faster the next session orients.

**Date completions when order matters.** If the sequence of completions matters for understanding the project's state, add a date to Done entries: `[2026-04-10] Built scoring logic`.

**Prune aggressively.** A CONTEXT.md that hasn't been pruned in a month is probably longer than it should be. Old Done items, obsolete references, and no-longer-relevant queued items should be removed. The goal is fast orientation, not comprehensive history.

**One CONTEXT.md per workspace.** Never consolidate multiple workspaces into one CONTEXT.md. Each workspace owns its own context.

---

## Quick Checklist

Before closing a session:

- [ ] In Progress is accurate — nothing that's done is still listed here
- [ ] Done reflects what was actually completed this session
- [ ] Queued includes any new tasks that came up
- [ ] Blocked is current — resolved blocks removed, new blocks added with specifics
- [ ] Functions updated only if a new recurring operation type was introduced
- [ ] Workflow updated only if the process sequence itself changed (not just progress through it)
- [ ] Any new conventions from this session are captured in Standards
- [ ] Any new key files are listed in References
- [ ] Nothing in the file describes a state that no longer exists

---

## Pi.dev Session-End Protocol

When ending productive OpenClaw work, run `memory-write` alongside this skill.

**Order:**
1. Update workspace CONTEXT.md (this skill) — current task state per workspace
2. Write to memory (memory-write skill) — decisions, patterns, lessons that transcend a single workspace

CONTEXT.md captures *where the work stands*. Memory captures *what was learned*. Both are needed. Neither substitutes for the other.
