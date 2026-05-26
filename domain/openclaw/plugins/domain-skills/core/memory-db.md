---
name: memory-db
description: Reference for the OpenClaw domain-memory plugin and embedded SQLite/sqlite-vec DB. Load when setting up domain memory, debugging recall, querying observations/goals, or changing memory tools.
---

# Memory DB Reference

## Architecture

Three components work together:

| Component | Location | Role |
|-----------|----------|------|
| `memory.db` | `~/.openclaw/workspace/memory.db` | Working substrate - observations, vectors, goals, scratchpad |
| `domain-memory` | `domain/openclaw/plugins/domain-memory/` | OpenClaw plugin - recall, status, observation writes, maintenance |
| `MEMORY.md` | `~/.openclaw/workspace/MEMORY.md` | Human-readable index - curated decisions, patterns, lessons |

The DB is the substrate. MEMORY.md is the record a human can read without a query tool. They are complementary — not duplicates.
`domain_memory_query` returns bounded, redacted excerpts for synthesis. It is not a raw observation export path.

## DB Schema

| Table | Purpose |
|-------|---------|
| `_meta` | One row: domain name, created date, embedding model |
| `observations` | Preserved events: tool calls, decisions, notes, session logs, errors, handoff snapshots |
| `observations_vec` | Vector embeddings (768-dim, nomic-embed-text) for semantic search |
| `observations_fts` | FTS5 full-text index for keyword search |
| `scratchpad` | Active checklist items across projects |
| `deferred_tasks` | Tasks queued for a future session; injected when due date is reached |
| `goals` | Declared ideal states; referenced by heartbeat goal reviews |

**Observation kinds:** `tool_call`, `decision`, `note`, `log`, `compact_summary`, `error`

## How Recall Works

Recall is explicit in the OpenClaw version:
1. The routing row decides that memory is relevant.
2. The agent calls `domain_memory_query` for FTS + vector search over bounded excerpts.
3. The agent calls `scratchpad_list` for open cross-session items.
4. Heartbeat calls `memory_maintenance` to backfill embeddings.

FTS is the fallback. Vector search improves semantic retrieval when ollama is available.

## Querying the DB Directly

```bash
# Open the DB
sqlite3 ~/.openclaw/workspace/memory.db

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
# sqlite3 ~/.openclaw/workspace/memory.db \
#   "INSERT INTO deferred_tasks (project, task, due_date) VALUES ('my-project', 'Follow up with client on proposal', '2026-05-01');"

# Current goals
SELECT name, scope, project, definition FROM goals;

# Observation count by project
SELECT project, COUNT(*) FROM observations GROUP BY project ORDER BY COUNT(*) DESC;
```

## What Goes Where

| Item | Destination | Why |
|------|-------------|-----|
| Tool call worth preserving | `observations` (kind=`tool_call`) | Explicit activity log |
| Tool failure worth preserving | `observations` (kind=`error`) | Surfaceable patterns of recurring failures |
| Decision made in a session | `observations` (kind=`decision`) + `MEMORY.md` | DB for recall, MD for human review |
| Lesson learned | `observations` (kind=`note`) + `MEMORY.md` | Dual-write for durability |
| Context before handoff | `observations` (kind=`compact_summary`) | Survives session changes |
| Active task | `scratchpad` | Queried by `scratchpad_list` |
| Task to revisit later | `deferred_tasks` | Queried by heartbeat/status routines |
| Ongoing goal | `goals` | Referenced by heartbeat goal review |
| Cross-project pattern | `MEMORY.md` | Human-curated; also in observations as kind=`note` |

## Setup Checklist

1. Verify ollama is running: `curl http://localhost:11434/api/tags`
2. Verify nomic-embed-text is pulled: `ollama list | grep nomic`
3. Verify `OPENCLAW_DOMAIN_NAME` is set in the domain workspace `.env`
4. Verify `~/.openclaw/active-domain` contains the domain name
5. Set `PROJECT_ID` in the project env source (tags observations to this project)
6. Optionally set `PROJECT_WORKSPACE` and `PROJECT_PHASE`
7. Run an OpenClaw turn that calls `domain_info` or `domain_status`
8. Verify DB was created: `ls -la ~/.openclaw/workspace/memory.db`

## Diagnosing Recall Failures

**Recall returns nothing relevant:**
- Check FTS is working: `sqlite3 memory.db "SELECT content FROM observations_fts WHERE observations_fts MATCH 'test' LIMIT 5;"`
- Check observation count: `sqlite3 memory.db "SELECT COUNT(*) FROM observations;"`
- If count is 0: no explicit `observation_write` calls or heartbeat writes have run yet

**Vector search not working:**
- Check ollama is running and nomic-embed-text is available
- Check `observations_vec` has rows: `sqlite3 memory.db "SELECT COUNT(*) FROM observations_vec;"`
- If 0: embeddings haven't been computed yet - run `memory_maintenance`

**Extension not connecting:**
- Check `~/.openclaw/workspace/.env` has `OPENCLAW_DOMAIN_NAME` set
- Check OpenClaw gateway/plugin logs for domain-memory load errors
- Check directory exists: `ls ~/.openclaw/workspace/`

**Wrong project observations mixing in:**
- Verify `PROJECT_ID` is set per project in the env source used by the route
- Query by project: `SELECT project, COUNT(*) FROM observations GROUP BY project;`
