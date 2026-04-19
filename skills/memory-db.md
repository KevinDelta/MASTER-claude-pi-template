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
| `observations` | All captured events: tool calls, decisions, notes, session logs |
| `observations_vec` | Vector embeddings (768-dim, nomic-embed-text) for semantic search |
| `observations_fts` | FTS5 full-text index for keyword search |
| `scratchpad` | Active checklist items across projects |
| `goals` | Declared ideal states; referenced by watches for delta tracking |

## How Recall Works

On every turn (`before_agent_start` hook):
1. FTS search on current prompt against `observations_fts` — always available
2. Vector search on prompt embedding against `observations_vec` — available when ollama is up
3. Results merged, deduplicated, ranked (vector results first)
4. Top N injected into system prompt (16K token budget)
5. Open scratchpad items for current project appended

FTS is the fallback. Vector search improves semantic retrieval but FTS alone is useful.

## Querying the DB Directly

```bash
# Open the DB
sqlite3 ~/.pi/domain/<domain-name>/memory.db

# Check domain identity
SELECT * FROM _meta;

# Recent observations
SELECT ts, project, kind, substr(content, 1, 100) FROM observations
ORDER BY ts DESC LIMIT 20;

# Open scratchpad items
SELECT project, item, created_at FROM scratchpad
WHERE completed_at IS NULL ORDER BY created_at;

# Current goals
SELECT name, scope, project, definition FROM goals;

# Observation count by project
SELECT project, COUNT(*) FROM observations GROUP BY project ORDER BY COUNT(*) DESC;
```

## What Goes Where

| Item | Destination | Why |
|------|-------------|-----|
| Tool call during a session | `observations` (auto-captured) | Raw activity log |
| Decision made in a session | `observations` (kind='decision') + `MEMORY.md` | DB for recall, MD for human review |
| Lesson learned | `observations` (kind='note') + `MEMORY.md` | Same — dual-write for durability |
| Active task | `scratchpad` | Injected every turn; auto-excluded when completed |
| Ongoing goal | `goals` | Referenced by watches; triggers resolver on delta |
| Cross-project pattern | `MEMORY.md` | Human-curated; also in observations as kind='note' |

## Setup Checklist

1. Verify ollama is running: `curl http://localhost:11434/api/tags`
2. Verify nomic-embed-text is pulled: `ollama list | grep nomic`
3. Verify `PI_DOMAIN_NAME` is set in `~/.pi/domain/<name>/.pi/.env`
4. Verify `~/.pi/active-domain` contains the domain name
5. Start a pi session — memory-db extension logs: `memory-db: connected → <path>`
6. Verify DB was created: `ls -la ~/.pi/domain/<name>/memory.db`

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
