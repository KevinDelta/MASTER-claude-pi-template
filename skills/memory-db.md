---
name: memory-db
description: Reference for the embedded domain memory DB (sqlite-vec). Load when setting up domain memory for the first time, debugging recall failures, querying observations or goals, or when asked about how domain memory works.
---

# Memory DB Reference

## Architecture

Three components work together:

| Component | Location | Role |
|-----------|----------|------|
| `memory.db` | `~/.pi/domain/<name>/memory.db` | Working substrate — all observations, vectors, goals, scratchpad |
| `memory-db.ts` | `~/.pi/domain/<name>/.pi/extensions/memory-db.ts` | Extension — hooks session lifecycle, runs recall, captures observations |
| `MEMORY.md` | `~/.pi/domain/<name>/MEMORY.md` | Human-readable index — curated decisions, patterns, lessons |

The DB is the substrate. MEMORY.md is the record a human can read without a query tool. They are complementary — not duplicates.

## DB Schema

| Table | Purpose |
|-------|---------|
| `_meta` | One row: domain name, created date, embedding model |
| `observations` | All captured events: tool calls, decisions, notes, session logs, errors, compaction snapshots |
| `observations_vec` | Vector embeddings (768-dim, nomic-embed-text) for semantic search |
| `observations_fts` | FTS5 full-text index for keyword search |
| `scratchpad` | Active checklist items across projects |
| `deferred_tasks` | Tasks queued for a future session; injected when due date is reached |
| `goals` | Declared ideal states; referenced by watches for delta tracking |

**Observation kinds:** `tool_call` · `decision` · `note` · `log` · `compact_summary` · `error`

## How Recall Works

On every turn (`before_agent_start` hook):
1. FTS search on current prompt against `observations_fts` — always available
2. Vector search on prompt embedding against `observations_vec` — available when ollama is up
3. Results merged, deduplicated, ranked (vector results first)
4. Top N injected into system prompt (16K token budget)
5. Open scratchpad items for current project appended
6. Deferred tasks with `due_date <= today` appended, tagged `[deferred]`

FTS is the fallback. Vector search improves semantic retrieval but FTS alone is useful.

## Querying the DB Directly

```bash
# Open the DB
sqlite3 ~/.pi/domain/<domain-name>/memory.db

# Check domain identity
SELECT * FROM _meta;

# Recent observations (any kind)
SELECT ts, project, workspace, kind, substr(content, 1, 100) FROM observations
ORDER BY ts DESC LIMIT 20;

# Errors captured this week
SELECT ts, project, substr(content, 1, 200) FROM observations
WHERE kind = 'error' AND ts > datetime('now', '-7 days')
ORDER BY ts DESC;

# Last compaction snapshot (what was preserved before context compression)
SELECT ts, content FROM observations
WHERE kind = 'compact_summary'
ORDER BY ts DESC LIMIT 1;

# Open scratchpad items
SELECT project, item, created_at FROM scratchpad
WHERE completed_at IS NULL ORDER BY created_at;

# Pending deferred tasks
SELECT project, task, due_date, created_at FROM deferred_tasks
WHERE completed_at IS NULL ORDER BY due_date ASC;

# Queue a deferred task (run from bash)
# sqlite3 ~/.pi/domain/<name>/memory.db \
#   "INSERT INTO deferred_tasks (project, task, due_date) VALUES ('my-project', 'Follow up with client on proposal', '2026-05-01');"

# Current goals
SELECT name, scope, project, definition FROM goals;

# Observation count by project
SELECT project, COUNT(*) FROM observations GROUP BY project ORDER BY COUNT(*) DESC;
```

## What Goes Where

| Item | Destination | Why |
|------|-------------|-----|
| Tool call during a session | `observations` (kind=`tool_call`, auto-captured) | Raw activity log |
| Tool failure | `observations` (kind=`error`, auto-captured) | Surfaceable patterns of recurring failures |
| Decision made in a session | `observations` (kind=`decision`) + `MEMORY.md` | DB for recall, MD for human review |
| Lesson learned | `observations` (kind=`note`) + `MEMORY.md` | Same — dual-write for durability |
| Context before compaction | `observations` (kind=`compact_summary`, auto-captured) | Survives session compression; re-injected next turn |
| Active task | `scratchpad` | Injected every turn; auto-excluded when completed |
| Task to revisit later | `deferred_tasks` | Injected when due_date is reached; survives across sessions |
| Ongoing goal | `goals` | Referenced by watches; triggers resolver on delta |
| Cross-project pattern | `MEMORY.md` | Human-curated; also in observations as kind=`note` |

## Setup Checklist

1. Verify ollama is running: `curl http://localhost:11434/api/tags`
2. Verify nomic-embed-text is pulled: `ollama list | grep nomic`
3. Verify `PI_DOMAIN_NAME` is set in `~/.pi/domain/<name>/.pi/.env`
4. Verify `~/.pi/active-domain` contains the domain name
5. Set `PI_PROJECT_ID` in `<project-root>/.pi/.env` (tags all observations to this project)
6. Optionally set `PI_WORKSPACE` and `PI_PHASE` in the project `.env` to tag observations with workspace and project phase context
7. Start a pi session — memory-db extension logs: `memory-db: connected → <path>`
8. Verify DB was created: `ls -la ~/.pi/domain/<name>/memory.db`

## Diagnosing Recall Failures

**Recall returns nothing relevant:**
- Check FTS is working: `sqlite3 memory.db "SELECT content FROM observations_fts WHERE observations_fts MATCH 'test' LIMIT 5;"`
- Check observation count: `sqlite3 memory.db "SELECT COUNT(*) FROM observations;"`
- If count is 0: auto-capture may be off (`PI_MEMORY_AUTO_CAPTURE=false`) or no sessions have run yet

**Vector search not working:**
- Check ollama is running and nomic-embed-text is available
- Check `observations_vec` has rows: `sqlite3 memory.db "SELECT COUNT(*) FROM observations_vec;"`
- If 0: embeddings haven't been computed yet — run a session and let `agent_end` backfill

**Extension not connecting:**
- Check `~/.pi/domain/<name>/.pi/.env` has `PI_DOMAIN_NAME` set
- Check pi session logs for `memory-db: failed to open DB` error
- Check directory exists: `ls ~/.pi/domain/<name>/`

**Wrong project observations mixing in:**
- Verify `PI_PROJECT_ID` is set per project in `<project-root>/.pi/.env`
- Query by project: `SELECT project, COUNT(*) FROM observations GROUP BY project;`
