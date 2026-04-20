---
name: memory-architecture
description: Reference for the domain memory DB (SQLite + sqlite-vec). Load when setting up memory for a new domain, debugging why context isn't surfacing, or understanding how the memory extension works.
---

# memory-architecture

## Purpose

Explains how the domain memory system works so you can set it up correctly, diagnose problems, and understand what gets captured and when. Load when onboarding a new domain, troubleshooting missing context, or deciding what to write to memory.

---

## The Domain Memory DB

**Location:** `~/.pi/domain/<name>/memory.db`

One SQLite file per domain. Carries across every project in the domain. No HTTP service. No Docker.

**Extension:** `memory-db.ts` (in `domain/.pi/extensions/`) — hooks into pi's lifecycle events:

| Hook | What it does |
|------|-------------|
| `session_start` | Opens DB, initializes schema, logs connection status |
| `before_agent_start` | FTS + vector search on current prompt; injects top results (16K budget); injects open scratchpad items and deferred tasks due today |
| `tool_call` | Captures write/edit/bash calls as `tool_call` observation rows; skips read-only and memory tools |
| `tool_call_error` | Captures tool failures as `error` observation rows (tool name, error message, workspace, phase) |
| `session_compact` | Before context compression: snapshots open scratchpad, active goals, and recent decisions as a `compact_summary` observation |
| `agent_end` | Backfills embeddings for unembedded observations (up to 50 per session); optionally appends session summary to MEMORY.md |

**Embedding:** nomic-embed-text via local ollama (768 dimensions, MIT license, retrieval-tuned). Local by default — observations never leave the machine.

**Graceful degradation:** if DB is unavailable, all hooks return early. If ollama is unavailable, FTS search still works — only vector recall is skipped.

---

## Schema

```sql
-- Domain identity; one row
CREATE TABLE _meta (
  domain_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  embedding_model TEXT DEFAULT 'nomic-embed-text'
);

-- Raw session events: tool calls, decisions, notes, errors, compaction snapshots
CREATE TABLE observations (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  project   TEXT,       -- PI_PROJECT_ID; null for domain-scoped entries
  workspace TEXT,       -- PI_WORKSPACE; null if unset
  kind      TEXT CHECK(kind IN ('tool_call','decision','note','log','compact_summary','error')),
  content   TEXT NOT NULL,
  meta      TEXT        -- JSON blob
);

-- Vector index (sqlite-vec, 768-dim nomic-embed-text)
CREATE VIRTUAL TABLE observations_vec USING vec0(
  observation_id INTEGER PRIMARY KEY,
  embedding FLOAT[768]
);

-- Full-text search index (FTS5)
CREATE VIRTUAL TABLE observations_fts USING fts5(
  content, project, workspace, kind,
  content=observations, content_rowid=id
);

-- Active checklist across projects; injected before every turn
CREATE TABLE scratchpad (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project      TEXT,
  item         TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Tasks queued for a future session; injected when due_date is reached
CREATE TABLE deferred_tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project      TEXT,
  task         TEXT NOT NULL,
  due_date     TEXT,   -- ISO date string; NULL = inject on next session
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Declared ideal state; referenced by watches for delta checks
CREATE TABLE goals (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  scope          TEXT CHECK(scope IN ('domain','project')) DEFAULT 'domain',
  project        TEXT,
  name           TEXT NOT NULL UNIQUE,
  definition     TEXT,
  check_cron     TEXT,
  resolver_skill TEXT
);
```

---

## What Goes Where

| Information | Where to put it | How it gets there |
|-------------|----------------|-------------------|
| Decision + rationale | `MEMORY.md` + `observations` (`kind='decision'`) | Write manually (memory-write skill) |
| Client/team preference | `MEMORY.md` | Write manually |
| Lesson learned | `MEMORY.md` + `observations` (`kind='note'`) | Write manually |
| Active open item | `scratchpad` | Write manually; auto-injected before every turn |
| Task for a future session | `deferred_tasks` | Write manually via sqlite3; auto-injected when due |
| Tool call observations | `observations` (`kind='tool_call'`) | Auto-captured by memory-db.ts |
| Tool failure | `observations` (`kind='error'`) | Auto-captured by tool_call_error hook |
| Pre-compaction context snapshot | `observations` (`kind='compact_summary'`) | Auto-captured by session_compact hook |
| Domain goals | `goals` | Write manually or via watches |

**Rule of thumb:** Decisions, preferences, and lessons belong in MEMORY.md — human-readable, git-committed, durable. Observations are auto-captured ephemera that feed search. Scratchpad items drive continuity across sessions.

---

## Setup

### One-time per machine

```bash
# Install DB dependencies
npm install -g better-sqlite3 sqlite-vec

# Install ollama and pull embedding model
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull nomic-embed-text
```

### Per project

Add to `<project-root>/.pi/.env`:

```bash
PI_PROJECT_ID=my-project-slug

# Optional: tag observations with active workspace and phase
PI_WORKSPACE=research          # matches workspaces/<name>/ folder
PI_PHASE=delivery              # e.g. discovery, delivery, review, maintenance
```

`PI_PROJECT_ID` is required — it namespaces all observations for this project. `PI_WORKSPACE` and `PI_PHASE` are optional; when set, they are stored in observation `meta` and the `workspace` column, enabling per-workspace and per-phase recall filtering.

The domain-level config (`~/.pi/domain/<name>/.pi/.env`) handles everything else — DB path, ollama URL, token budget.

---

## Diagnosing Missing Context

**DB not opening:**
- Check `PI_DOMAIN_NAME` is set in the domain env or passed as `--domain` to pi
- Check `PI_DOMAIN_DB_PATH` override if using a non-default path
- Check `better-sqlite3` and `sqlite-vec` are installed: `npm list -g better-sqlite3 sqlite-vec`

**Vector search not working:**
- Is ollama running? `ollama list` — should show `nomic-embed-text`
- Start ollama: `ollama serve`
- FTS still works without ollama — only vector recall is skipped

**Observations not being captured:**
- Is `PI_PROJECT_ID` set in `.pi/.env`?
- Is `PI_MEMORY_AUTO_CAPTURE` set to `false`? Default is true.
- Check the session start log for "memory-db: connected"

**Relevant context not surfacing:**
- Is the information in MEMORY.md or observations, or only in conversation context?
- Is the query specific enough? Vague prompts return vague matches.
- Try the explicit search tools if auto-injection missed something.

---

## Multi-Device (Roadmap)

Phase 1: iCloud Drive or syncthing — filesystem sync of `memory.db`. Works for single-writer scenarios (one device active at a time).

Phase 2: LanceDB with object storage (S3, R2, GCS) — native multi-writer support. Migration path from sqlite-vec is planned but not yet implemented.
