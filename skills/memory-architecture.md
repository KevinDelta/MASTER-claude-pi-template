---
name: memory-architecture
description: Reference for the OpenClaw domain memory architecture. Load when setting up memory for a new domain, debugging missing context, or changing memory plugin behavior.
---

# memory-architecture

## Purpose

Explains how domain memory works in the OpenClaw refactor: what is stored, where it lives, how recall is triggered, and how heartbeat maintains it.

---

## Domain Memory DB

Domain memory has two local layers:

| Layer | Location | Use |
|-------|----------|-----|
| OpenClaw Markdown memory | `MEMORY.md` and `memory/*.md` | Human-readable durable facts, preferences, principles, and promoted lessons |
| Framework structured memory | `memory.db` | Timestamped observations, scratchpad, deferred tasks, goals, project activity, FTS, and vector recall |

**Location:** `~/.openclaw/agents/<name>/memory.db`

One SQLite file per domain. It carries across every project in the domain. No HTTP service. No Docker.

**Plugin:** `domain-memory` in `domain/openclaw/plugins/domain-memory/`

The plugin exposes explicit OpenClaw tools:

| Tool | What it does |
|------|--------------|
| `domain_info` | Opens DB, initializes schema, returns domain/persona metadata |
| `domain_memory_query` | Runs FTS + vector search and returns bounded, redacted excerpts |
| `scratchpad_list` | Returns active cross-session items |
| `domain_status` | Returns aggregate activity and open-item counts |
| `observation_write` | Writes structured observations |
| `memory_maintenance` | Backfills embeddings and reports health |
| `raw_observations` | Denied by `DOCK.md` policy |

There is no required invisible lifecycle injection. Routing rows decide when memory tools are used.

---

## Schema

```sql
CREATE TABLE _meta (
  domain_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  embedding_model TEXT DEFAULT 'nomic-embed-text'
);

CREATE TABLE observations (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  project   TEXT,       -- PROJECT_ID; null for domain-scoped entries
  workspace TEXT,       -- PROJECT_WORKSPACE; null if unset
  kind      TEXT CHECK(kind IN ('tool_call','decision','note','log','compact_summary','error')),
  content   TEXT NOT NULL,
  meta      TEXT
);

CREATE VIRTUAL TABLE observations_vec USING vec0(
  observation_id INTEGER PRIMARY KEY,
  embedding FLOAT[768]
);

CREATE VIRTUAL TABLE observations_fts USING fts5(
  content, project, workspace, kind,
  content=observations, content_rowid=id
);

CREATE TABLE scratchpad (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project      TEXT,
  item         TEXT NOT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE TABLE deferred_tasks (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  project      TEXT,
  task         TEXT NOT NULL,
  due_date     TEXT,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

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

`check_cron` remains for migration compatibility, but heartbeat is the active scheduler.

---

## What Goes Where

| Information | Destination | How it gets there |
|-------------|-------------|-------------------|
| Durable decision | `MEMORY.md` + `observations(kind='decision')` | Manual edit + `observation_write` |
| Client/team preference | `MEMORY.md` | Manual edit |
| Lesson learned | `MEMORY.md` + `observations(kind='note')` | Manual edit + `observation_write` |
| Active open item | `scratchpad` or `observations(kind='note')` | Plugin/tool write |
| Task for later | `deferred_tasks` | Plugin/sqlite write |
| Heartbeat result | `observations(kind='log')` | `observation_write` |
| Domain goal | `goals` | Manual/sqlite write, reviewed by heartbeat |

Rule of thumb: durable decisions, preferences, and lessons belong in `MEMORY.md`; searchable operational state belongs in the DB.

Promotion flow:

1. Work and heartbeat turns write structured observations into `memory.db`.
2. `memory_maintenance` backfills embeddings and reports memory health.
3. The worker or agent promotes durable lessons into `MEMORY.md`.
4. OpenClaw native memory search can recall the promoted Markdown layer.

The DB is not a replacement for `MEMORY.md`; it is the structured substrate underneath it.

---

## Setup

```bash
./install.sh --domain <name> --persona <persona-name>
```

The installer copies the plugin to `~/.openclaw/plugins/domain-memory-<domain>/`, links it with OpenClaw, and creates the domain workspace.

Per project, set:

```bash
PROJECT_ID=my-project-slug
PROJECT_WORKSPACE=research
PROJECT_PHASE=delivery
```

`PROJECT_ID` namespaces observations. Workspace and phase are optional tags.

---

## Diagnosing Missing Context

**DB not opening:**
- Check `~/.openclaw/agents/<name>/` exists.
- Run `domain_info`.
- Check plugin load paths in `~/.openclaw/openclaw.json`.
- Check `better-sqlite3` and `sqlite-vec` are installed.

**Vector search not working:**
- Check ollama is running: `ollama list`.
- Confirm `nomic-embed-text` is available.
- Run `memory_maintenance`.
- FTS still works without ollama.

**Observations missing:**
- Confirm `observation_write` was called.
- Confirm `PROJECT_ID` is set for project-scoped work.
- Query counts with `domain_status`.

**Relevant context not surfacing:**
- Read `MEMORY.md`.
- Search with a more specific `domain_memory_query`.
- Add missing durable knowledge through `memory-write`.

---

## Multi-Device Roadmap

Phase 1: filesystem sync of the workspace for single-writer scenarios.

Phase 2: LanceDB/object storage for safe multi-writer support. SQLite/sqlite-vec remains the default for this refactor. A LanceDB backend must preserve the same worker-owned portability and default-deny export policy: summaries and bounded excerpts are allowed, raw observation/vector export is not.
