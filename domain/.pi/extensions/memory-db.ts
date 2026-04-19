/**
 * memory-db.ts
 *
 * Pi extension: embedded domain memory using SQLite + sqlite-vec.
 * Replaces the HTTP-based agentmemory-bridge for the domain layer.
 * One SQLite file at ~/.pi/domain/<domain-name>/memory.db — no daemon, no Docker.
 *
 * Hooks:
 *   session_start      — open DB, initialize schema, log connection status
 *   before_agent_start — FTS + vector search on current prompt; inject top N slices (16K budget)
 *   tool_call          — capture write/edit/bash calls as observation rows
 *   agent_end          — compute embeddings for unembedded observations via ollama; optionally
 *                        append session summary comment to MEMORY.md
 *
 * Graceful degradation:
 *   - If DB is unavailable: all hooks return early, pi continues uninterrupted
 *   - If ollama is unavailable: embeddings are skipped; FTS search still works
 *   - Embedding backfill: observations without vectors are retried each agent_end
 *
 * Prerequisites (install once per machine):
 *   npm install -g better-sqlite3 sqlite-vec
 *   ollama pull nomic-embed-text
 *
 * Configuration (via ~/.pi/domain/<name>/.pi/.env):
 *   PI_DOMAIN_NAME         — domain name (required; set by install.sh)
 *   PI_DOMAIN_DB_PATH      — absolute path to memory.db (default: ~/.pi/domain/<name>/memory.db)
 *   PI_PROJECT_ID          — current project identifier (set per project in <project-root>/.pi/.env)
 *   PI_MEMORY_TOKEN_BUDGET — chars of context to inject per turn (default: 16000 tokens × 4)
 *   PI_MEMORY_TOP_N        — number of observations to retrieve (default: 10)
 *   OLLAMA_URL             — ollama endpoint (default: http://localhost:11434)
 *   PI_MEMORY_SYNC_MD      — append session summary to MEMORY.md at agent_end (default: false)
 *   PI_MEMORY_AUTO_CAPTURE — capture tool calls as observations (default: true)
 *
 * Note on better-sqlite3: synchronous driver is intentional. Pi extension hooks run in an
 * async context but SQLite operations here are fast enough that sync avoids event loop
 * complexity. If pi's extension runtime changes, swap for @sqlite.org/sqlite-wasm — but
 * note that sqlite-vec currently ships native extensions only, not WASM.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

// ─── configuration ────────────────────────────────────────────────────────────

const DOMAIN_NAME = process.env.PI_DOMAIN_NAME ?? "default";
const DEFAULT_DB_PATH = path.join(os.homedir(), ".pi", "domain", DOMAIN_NAME, "memory.db");
const DB_PATH = process.env.PI_DOMAIN_DB_PATH ?? DEFAULT_DB_PATH;
const PROJECT_ID = process.env.PI_PROJECT_ID ?? null;
const TOKEN_BUDGET = parseInt(process.env.PI_MEMORY_TOKEN_BUDGET ?? "16000", 10) || 16000;
const TOP_N = parseInt(process.env.PI_MEMORY_TOP_N ?? "10", 10) || 10;
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const SYNC_MD = process.env.PI_MEMORY_SYNC_MD === "true";
const AUTO_CAPTURE = process.env.PI_MEMORY_AUTO_CAPTURE !== "false";

// Read-only and memory tools generate noise without signal — skip capture
const SKIP_CAPTURE_TOOLS = new Set([
  "read",
  "memory_read",
  "memory_search",
  "memory_recall",
  "memory_smart_search",
  "memory_patterns",
  "memory_graph_query",
]);

// nomic-embed-text produces 768-dimensional vectors
const EMBEDDING_DIM = 768;

// ─── db initialization ────────────────────────────────────────────────────────

function initDB(dbPath: string): Database.Database {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });

  const db = new Database(dbPath);
  sqliteVec.load(db);

  // WAL mode for concurrent read performance
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS _meta (
      domain_name TEXT NOT NULL,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      embedding_model TEXT DEFAULT 'nomic-embed-text'
    );

    CREATE TABLE IF NOT EXISTS observations (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      ts        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      project   TEXT,
      workspace TEXT,
      kind      TEXT CHECK(kind IN ('tool_call','decision','note','log')),
      content   TEXT NOT NULL,
      meta      TEXT
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS observations_vec USING vec0(
      observation_id INTEGER PRIMARY KEY,
      embedding FLOAT[${EMBEDDING_DIM}]
    );

    CREATE VIRTUAL TABLE IF NOT EXISTS observations_fts USING fts5(
      content,
      project,
      workspace,
      kind,
      content=observations,
      content_rowid=id
    );

    CREATE TABLE IF NOT EXISTS scratchpad (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      project      TEXT,
      item         TEXT NOT NULL,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      scope          TEXT CHECK(scope IN ('domain','project')) DEFAULT 'domain',
      project        TEXT,
      name           TEXT NOT NULL UNIQUE,
      definition     TEXT,
      check_cron     TEXT,
      resolver_skill TEXT
    );
  `);

  // Seed _meta on first create
  const metaCount = (db.prepare("SELECT COUNT(*) as c FROM _meta").get() as { c: number }).c;
  if (metaCount === 0) {
    db.prepare("INSERT INTO _meta (domain_name) VALUES (?)").run(DOMAIN_NAME);
  }

  return db;
}

// ─── search helpers ───────────────────────────────────────────────────────────

function searchFTS(db: Database.Database, query: string, limit: number): string[] {
  try {
    // Sanitize: FTS5 MATCH syntax chokes on unquoted special chars
    const safeQuery = query.replace(/['"*^()]/g, " ").trim();
    if (!safeQuery) return [];
    const rows = db.prepare(`
      SELECT content FROM observations_fts
      WHERE observations_fts MATCH ?
      ORDER BY rank
      LIMIT ?
    `).all(safeQuery, limit) as { content: string }[];
    return rows.map((r) => r.content);
  } catch {
    return [];
  }
}

function searchVec(db: Database.Database, embedding: number[], limit: number): string[] {
  try {
    const rows = db.prepare(`
      SELECT o.content
      FROM observations_vec v
      JOIN observations o ON o.id = v.observation_id
      WHERE v.embedding MATCH ?
      ORDER BY v.distance
      LIMIT ?
    `).all(JSON.stringify(embedding), limit) as { content: string }[];
    return rows.map((r) => r.content);
  } catch {
    return [];
  }
}

// ─── embedding via ollama ─────────────────────────────────────────────────────

async function computeEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { embedding?: number[] };
    return data.embedding ?? null;
  } catch {
    return null; // ollama unavailable — FTS still works
  }
}

// ─── observation capture ──────────────────────────────────────────────────────

function insertObservation(
  db: Database.Database,
  project: string | null,
  workspace: string | null,
  kind: "tool_call" | "decision" | "note" | "log",
  content: string,
  meta: Record<string, unknown> | null
): number {
  const result = db.prepare(`
    INSERT INTO observations (project, workspace, kind, content, meta)
    VALUES (?, ?, ?, ?, ?)
  `).run(project, workspace, kind, content, meta ? JSON.stringify(meta) : null);
  return result.lastInsertRowid as number;
}

// ─── extension factory ────────────────────────────────────────────────────────

export default function (pi: ExtensionAPI): void {
  let db: Database.Database | null = null;

  /**
   * session_start — runs when pi loads the session.
   * Opens DB, initializes schema, logs connection status.
   */
  pi.on("session_start", async (_event, _ctx) => {
    try {
      db = initDB(DB_PATH);
      console.log(
        `memory-db: connected → ${DB_PATH} (domain: ${DOMAIN_NAME}, project: ${PROJECT_ID ?? "none"})`
      );
    } catch (err) {
      console.warn(`memory-db: failed to open DB at ${DB_PATH} — ${err}`);
      db = null;
    }
  });

  /**
   * before_agent_start — fires before every agent turn.
   * Runs FTS + vector search on the current prompt.
   * Injects top N slices into the system prompt (16K token budget).
   * Also injects open scratchpad items for the current project.
   */
  pi.on("before_agent_start", async (event, _ctx) => {
    if (!db) return;
    const query = event.prompt;
    if (!query) return;

    const charBudget = TOKEN_BUDGET * 4; // rough char/token ratio

    // FTS search (always available)
    const ftsResults = searchFTS(db, query, TOP_N);

    // Vector search (available when ollama is up)
    const embedding = await computeEmbedding(query);
    const vecResults = embedding ? searchVec(db, embedding, TOP_N) : [];

    // Merge: deduplicate by content; prefer vector results (more semantic) first
    const seen = new Set<string>();
    const merged: string[] = [];
    for (const content of [...vecResults, ...ftsResults]) {
      if (!seen.has(content)) {
        seen.add(content);
        merged.push(content);
      }
    }

    // Active scratchpad items for the current project
    const scratchpadRows = db.prepare(`
      SELECT item FROM scratchpad
      WHERE (project = ? OR project IS NULL)
        AND completed_at IS NULL
      ORDER BY created_at DESC
      LIMIT 20
    `).all(PROJECT_ID) as { item: string }[];
    const scratchpadItems = scratchpadRows.map((r) => `- ${r.item}`).join("\n");

    if (merged.length === 0 && !scratchpadItems) return;

    // Build injection, respecting char budget
    let injection = "";

    if (scratchpadItems) {
      injection += `Open scratchpad items:\n${scratchpadItems}\n\n`;
    }

    for (const slice of merged) {
      const candidate = injection + slice + "\n";
      if (candidate.length > charBudget) break;
      injection = candidate;
    }

    if (!injection.trim()) return;

    return {
      systemPrompt:
        event.systemPrompt +
        `\n\n<!-- memory-db recall -->\n${injection.trim()}\n<!-- end memory-db recall -->`,
    };
  });

  /**
   * tool_call — fires before every tool execution.
   * Captures write/edit/bash calls as observation rows.
   * Skips read-only tools and memory tools to avoid noise and feedback loops.
   */
  pi.on("tool_call", async (event, _ctx) => {
    if (!db || !AUTO_CAPTURE) return;
    if (SKIP_CAPTURE_TOOLS.has(event.toolName)) return;

    const content = `Tool: ${event.toolName}\nArgs: ${JSON.stringify(event.input).slice(0, 800)}`;
    const meta: Record<string, unknown> = {
      tool: event.toolName,
      inputSummary: JSON.stringify(event.input).slice(0, 200),
    };
    insertObservation(db, PROJECT_ID, null, "tool_call", content, meta);
  });

  /**
   * agent_end — fires when the agent loop completes.
   * Computes embeddings for observations that don't have vectors yet.
   * Embeddings are batched here rather than at insert time to avoid
   * blocking tool_call hooks on network latency.
   * Optionally appends a session summary comment to MEMORY.md.
   */
  pi.on("agent_end", async (_event, _ctx) => {
    if (!db) return;

    // Find observations missing embeddings (cap at 50 per session to bound run time)
    const unembedded = db.prepare(`
      SELECT o.id, o.content
      FROM observations o
      LEFT JOIN observations_vec v ON v.observation_id = o.id
      WHERE v.observation_id IS NULL
      ORDER BY o.id DESC
      LIMIT 50
    `).all() as { id: number; content: string }[];

    for (const row of unembedded) {
      const embedding = await computeEmbedding(row.content);
      if (!embedding) continue; // ollama unavailable — will retry next session
      try {
        db.prepare(`
          INSERT INTO observations_vec (observation_id, embedding)
          VALUES (?, ?)
        `).run(row.id, JSON.stringify(embedding));
      } catch {
        // Duplicate key on race — safe to ignore
      }
    }

    // Optional: append session summary comment to MEMORY.md
    if (SYNC_MD) {
      const domainMemoryPath = path.join(
        os.homedir(), ".pi", "domain", DOMAIN_NAME, "MEMORY.md"
      );
      const sessionCount = (db.prepare(`
        SELECT COUNT(*) as c FROM observations
        WHERE (project = ? OR (project IS NULL AND ? IS NULL))
          AND ts > datetime('now', '-1 hour')
      `).get(PROJECT_ID, PROJECT_ID) as { c: number }).c;

      if (sessionCount > 0 && fs.existsSync(domainMemoryPath)) {
        const ts = new Date().toISOString().slice(0, 16);
        const label = PROJECT_ID ? `project: ${PROJECT_ID}` : "domain";
        const line = `\n<!-- session ${ts} — ${sessionCount} observations captured (${label}) -->`;
        fs.appendFileSync(domainMemoryPath, line);
      }
    }
  });
}
