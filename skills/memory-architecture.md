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
| `before_agent_start` | FTS + vector search on current prompt; injects top results (16K budget); injects open scratchpad items |
| `tool_call` | Captures write/edit/bash calls as observation rows; skips read-only and memory tools |
| `agent_end` | Backfills embeddings for unembedded observations (up to 50 per session); optionally appends session summary to MEMORY.md |

**Embedding:** nomic-embed-text via local ollama (768 dimensions, MIT license, retrieval-tuned). Local by default — observations never leave the machine.

**Graceful degradation:** if DB is unavailable, all hooks return early. If ollama is unavailable, FTS search still works — only vector recall is skipped.

---

## Schema

```sql
-- Project-scoped observation log (auto-captured from tool calls)
CREATE TABLE observations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT,           -- space-separated: "write edit decision"
  created_at TEXT DEFAULT (datetime('now'))
);

-- Vector index (sqlite-vec)
CREATE VIRTUAL TABLE observations_vec USING vec0(
  embedding FLOAT[768]
);

-- Full-text search index (FTS5)
CREATE VIRTUAL TABLE observations_fts USING fts5(
  content,
  tags,
  content=observations
);

-- Active open items (cross-project)
CREATE TABLE scratchpad (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  project_id TEXT,
  done INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Domain-level goals (for watches and proactivity)
CREATE TABLE goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  content TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

---

## What Goes Where

| Information | Where to put it | How it gets there |
|-------------|----------------|-------------------|
| Decision + rationale | `MEMORY.md` `#decision` tag | Write manually (memory-write skill) |
| Client/team preference | `MEMORY.md` `#preference` tag | Write manually |
| Lesson learned | `MEMORY.md` `#lesson` tag | Write manually |
| Active open item | `scratchpad` table | Write manually; auto-injected before every turn |
| Tool call observations | `observations` table | Auto-captured by memory-db.ts |
| Domain goals | `goals` table | Write manually or via watches |

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
```

This tags all observations captured in this project to the correct namespace in the domain DB.

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
