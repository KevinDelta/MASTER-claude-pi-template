import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";
import { Type } from "@sinclair/typebox";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const EMBEDDING_DIM = 768;
const MEMORY_SNIPPET_MAX_CHARS = 900;

type ObservationKind = "tool_call" | "decision" | "note" | "log" | "compact_summary" | "error";

function expandHome(input: string): string {
  if (input.startsWith("~/")) return path.join(os.homedir(), input.slice(2));
  return input;
}

function configValue(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function domainName(): string {
  return configValue("OPENCLAW_DOMAIN_NAME", "default");
}

function workspaceDir(): string {
  return path.join(os.homedir(), ".openclaw", "workspaces", domainName());
}

function dbPath(): string {
  return expandHome(configValue("DOMAIN_MEMORY_DB_PATH", path.join(workspaceDir(), "memory.db")));
}

function memoryPath(): string {
  return expandHome(configValue("DOMAIN_MEMORY_PATH", path.join(workspaceDir(), "MEMORY.md")));
}

function ollamaUrl(): string {
  return configValue("OLLAMA_URL", "http://localhost:11434");
}

function topN(): number {
  return Number(process.env.DOMAIN_MEMORY_TOP_N || 10) || 10;
}

function redactSensitive(input: string): string {
  return input
    .replace(/([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})/g, "[redacted-email]")
    .replace(/\b(?:api[_-]?key|token|secret|password|passwd)\s*[:=]\s*["']?[^"'\s,;]+/gi, "[redacted-secret]")
    .replace(/\b(?:sk|pk|rk|ghp|gho|ghu|ghs|xoxb|xoxp)[_-][A-Za-z0-9_=-]{12,}\b/g, "[redacted-token]");
}

function memorySnippet(input: string): string {
  const clean = redactSensitive(input).replace(/\s+/g, " ").trim();
  if (clean.length <= MEMORY_SNIPPET_MAX_CHARS) return clean;
  return `${clean.slice(0, MEMORY_SNIPPET_MAX_CHARS - 3)}...`;
}

function initDB(): Database.Database {
  const file = dbPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  sqliteVec.load(db);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS _meta (
      domain_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      embedding_model TEXT DEFAULT 'nomic-embed-text'
    );

    CREATE TABLE IF NOT EXISTS observations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ts TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      project TEXT,
      workspace TEXT,
      kind TEXT CHECK(kind IN ('tool_call','decision','note','log','compact_summary','error')),
      content TEXT NOT NULL,
      meta TEXT
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
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project TEXT,
      item TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS deferred_tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project TEXT,
      task TEXT NOT NULL,
      due_date TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scope TEXT CHECK(scope IN ('domain','project')) DEFAULT 'domain',
      project TEXT,
      name TEXT NOT NULL UNIQUE,
      definition TEXT,
      check_cron TEXT,
      resolver_skill TEXT
    );

    CREATE TRIGGER IF NOT EXISTS observations_fts_ai
      AFTER INSERT ON observations BEGIN
        INSERT INTO observations_fts(rowid, content, project, workspace, kind)
        VALUES (new.id, new.content, new.project, new.workspace, new.kind);
      END;

    CREATE TRIGGER IF NOT EXISTS observations_fts_ad
      AFTER DELETE ON observations BEGIN
        INSERT INTO observations_fts(observations_fts, rowid, content, project, workspace, kind)
        VALUES ('delete', old.id, old.content, old.project, old.workspace, old.kind);
      END;

    CREATE TRIGGER IF NOT EXISTS observations_fts_au
      AFTER UPDATE ON observations BEGIN
        INSERT INTO observations_fts(observations_fts, rowid, content, project, workspace, kind)
        VALUES ('delete', old.id, old.content, old.project, old.workspace, old.kind);
        INSERT INTO observations_fts(rowid, content, project, workspace, kind)
        VALUES (new.id, new.content, new.project, new.workspace, new.kind);
      END;
  `);

  const metaCount = (db.prepare("SELECT COUNT(*) as c FROM _meta").get() as { c: number }).c;
  if (metaCount === 0) {
    db.prepare("INSERT INTO _meta (domain_name) VALUES (?)").run(domainName());
  }
  return db;
}

function searchFTS(db: Database.Database, query: string, limit: number): string[] {
  try {
    const safe = query.replace(/['"*^()]/g, " ").trim();
    if (!safe) return [];
    return (db.prepare(`
      SELECT content FROM observations_fts
      WHERE observations_fts MATCH ?
      ORDER BY rank LIMIT ?
    `).all(safe, limit) as { content: string }[]).map((row) => memorySnippet(row.content));
  } catch {
    return [];
  }
}

async function computeEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${ollamaUrl()}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { embedding?: number[] };
    return data.embedding ?? null;
  } catch {
    return null;
  }
}

function searchVec(db: Database.Database, embedding: number[], limit: number): string[] {
  try {
    return (db.prepare(`
      SELECT o.content
      FROM observations_vec v
      JOIN observations o ON o.id = v.observation_id
      WHERE v.embedding MATCH ?
      ORDER BY v.distance LIMIT ?
    `).all(JSON.stringify(embedding), limit) as { content: string }[]).map((row) => memorySnippet(row.content));
  } catch {
    return [];
  }
}

function insertObservation(
  db: Database.Database,
  project: string | null,
  workspace: string | null,
  kind: ObservationKind,
  content: string,
  meta: Record<string, unknown> | null
): number {
  const result = db.prepare(`
    INSERT INTO observations (project, workspace, kind, content, meta)
    VALUES (?, ?, ?, ?, ?)
  `).run(project, workspace, kind, content, meta ? JSON.stringify(meta) : null);
  return result.lastInsertRowid as number;
}

function readSkills(): Array<{ name: string; description: string }> {
  const skillsDir = path.join(workspaceDir(), "skills");
  if (!fs.existsSync(skillsDir)) return [];
  const skills: Array<{ name: string; description: string }> = [];
  for (const file of fs.readdirSync(skillsDir)) {
    if (!file.endsWith(".md")) continue;
    const content = fs.readFileSync(path.join(skillsDir, file), "utf8");
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatter) continue;
    const name = frontmatter[1].match(/^name:\s*(.+)$/m)?.[1]?.trim();
    const description = frontmatter[1].match(/^description:\s*(.+)$/m)?.[1]?.trim();
    if (name && description) skills.push({ name, description });
  }
  return skills;
}

async function backfillEmbeddings(db: Database.Database, limit: number): Promise<number> {
  const rows = db.prepare(`
    SELECT o.id, o.content
    FROM observations o
    LEFT JOIN observations_vec v ON v.observation_id = o.id
    WHERE v.observation_id IS NULL
    ORDER BY o.id DESC
    LIMIT ?
  `).all(limit) as { id: number; content: string }[];

  let count = 0;
  for (const row of rows) {
    const embedding = await computeEmbedding(row.content);
    if (!embedding) continue;
    try {
      db.prepare(`
        INSERT INTO observations_vec (observation_id, embedding)
        VALUES (?, ?)
      `).run(row.id, JSON.stringify(embedding));
      count++;
    } catch {
      // Duplicate/race is safe to ignore.
    }
  }
  return count;
}

export default definePluginEntry({
  id: "domain-memory",
  name: "Domain Memory",
  description: "Local domain memory tools backed by SQLite and sqlite-vec.",
  register(api) {
    api.registerTool({
      name: "domain_info",
      description: "Return domain, persona, embedding model, and project count. Does not expose raw DB rows.",
      parameters: Type.Object({}),
      async execute() {
        const db = initDB();
        try {
          const meta = db.prepare("SELECT domain_name, created_at, embedding_model FROM _meta LIMIT 1").get() as
            | { domain_name: string; created_at: string; embedding_model: string }
            | undefined;
          const soulPath = path.join(workspaceDir(), "SOUL.md");
          const soul = fs.existsSync(soulPath) ? fs.readFileSync(soulPath, "utf8") : "";
          const persona = soul.match(/^\*\*Name:\*\*\s*(.+)$/m)?.[1]?.trim() || "not configured";
          const projectCount = (db.prepare(`
            SELECT COUNT(DISTINCT project) as c FROM observations WHERE project IS NOT NULL
          `).get() as { c: number }).c;
          return { content: [{ type: "text", text: JSON.stringify({
            domain: meta?.domain_name ?? domainName(),
            persona,
            embedding_model: meta?.embedding_model ?? "nomic-embed-text",
            created_at: meta?.created_at ?? null,
            project_count: projectCount,
          }, null, 2) }] };
        } finally {
          db.close();
        }
      },
    });

    api.registerTool({
      name: "list_active_projects",
      description: "Return project slugs with last activity and observation count. No file contents.",
      parameters: Type.Object({ days: Type.Optional(Type.Number()) }),
      async execute(_id, params: { days?: number }) {
        const days = params.days ?? 90;
        const db = initDB();
        try {
          const rows = db.prepare(`
            SELECT project, MAX(ts) as last_activity, COUNT(*) as observation_count
            FROM observations
            WHERE project IS NOT NULL AND ts > datetime('now', ? || ' days')
            GROUP BY project
            ORDER BY last_activity DESC
          `).all(`-${days}`);
          return { content: [{ type: "text", text: JSON.stringify({ projects: rows, lookback_days: days }, null, 2) }] };
        } finally {
          db.close();
        }
      },
    });

    api.registerTool({
      name: "list_skills",
      description: "Return skill names and descriptions only. Does not return skill file contents.",
      parameters: Type.Object({}),
      async execute() {
        return { content: [{ type: "text", text: JSON.stringify({
          skills: readSkills(),
          note: "Skill file contents are not exported by the dock allowlist.",
        }, null, 2) }] };
      },
    });

    api.registerTool({
      name: "domain_memory_query",
      description: "Search local domain memory using FTS and vector search. Returns bounded, redacted excerpts, not raw rows.",
      parameters: Type.Object({
        query: Type.String(),
        limit: Type.Optional(Type.Number()),
      }),
      async execute(_id, params: { query: string; limit?: number }) {
        const limit = Math.min(params.limit ?? topN(), 20);
        const db = initDB();
        try {
          const fts = searchFTS(db, params.query, limit);
          const embedding = await computeEmbedding(params.query);
          const vec = embedding ? searchVec(db, embedding, limit) : [];
          const seen = new Set<string>();
          const results: string[] = [];
          for (const item of [...vec, ...fts]) {
            if (!seen.has(item)) {
              seen.add(item);
              results.push(item);
            }
          }
          return { content: [{ type: "text", text: JSON.stringify({
            query: params.query,
            search_mode: embedding ? "vector+fts" : "fts_only",
            result_count: results.length,
            results: results.slice(0, limit),
            note: "Use these bounded excerpts to synthesize an answer. Do not claim raw DB access.",
          }, null, 2) }] };
        } finally {
          db.close();
        }
      },
    });

    api.registerTool({
      name: "scratchpad_list",
      description: "Return open scratchpad items, optionally filtered by project.",
      parameters: Type.Object({ project: Type.Optional(Type.String()) }),
      async execute(_id, params: { project?: string }) {
        const db = initDB();
        try {
          const rows = params.project
            ? db.prepare(`
                SELECT project, item, created_at FROM scratchpad
                WHERE project = ? AND completed_at IS NULL
                ORDER BY created_at DESC
              `).all(params.project)
            : db.prepare(`
                SELECT project, item, created_at FROM scratchpad
                WHERE completed_at IS NULL
                ORDER BY created_at DESC
              `).all();
          return { content: [{ type: "text", text: JSON.stringify({ items: rows, count: rows.length }, null, 2) }] };
        } finally {
          db.close();
        }
      },
    });

    api.registerTool({
      name: "domain_status",
      description: "Return aggregate domain stats, pending tasks, open scratchpad count, active goals, and active projects.",
      parameters: Type.Object({ days: Type.Optional(Type.Number()) }),
      async execute(_id, params: { days?: number }) {
        const days = params.days ?? 30;
        const db = initDB();
        try {
          const kindCounts = db.prepare(`
            SELECT kind, COUNT(*) as count FROM observations
            WHERE ts > datetime('now', ? || ' days')
            GROUP BY kind ORDER BY count DESC
          `).all(`-${days}`);
          const activeProjects = (db.prepare(`
            SELECT COUNT(DISTINCT project) as c FROM observations
            WHERE project IS NOT NULL AND ts > datetime('now', ? || ' days')
          `).get(`-${days}`) as { c: number }).c;
          const pendingDeferred = (db.prepare(`
            SELECT COUNT(*) as c FROM deferred_tasks WHERE completed_at IS NULL
          `).get() as { c: number }).c;
          const openScratchpad = (db.prepare(`
            SELECT COUNT(*) as c FROM scratchpad WHERE completed_at IS NULL
          `).get() as { c: number }).c;
          const activeGoals = (db.prepare("SELECT COUNT(*) as c FROM goals").get() as { c: number }).c;
          return { content: [{ type: "text", text: JSON.stringify({
            lookback_days: days,
            active_projects: activeProjects,
            observation_counts_by_kind: kindCounts,
            pending_deferred_tasks: pendingDeferred,
            open_scratchpad_items: openScratchpad,
            active_goals: activeGoals,
          }, null, 2) }] };
        } finally {
          db.close();
        }
      },
    });

    api.registerTool({
      name: "observation_write",
      description: "Write a structured note, decision, log, compact summary, or error to local domain memory.",
      parameters: Type.Object({
        kind: Type.Union([
          Type.Literal("decision"),
          Type.Literal("note"),
          Type.Literal("log"),
          Type.Literal("compact_summary"),
          Type.Literal("error"),
        ]),
        content: Type.String(),
        project: Type.Optional(Type.String()),
        workspace: Type.Optional(Type.String()),
        meta: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
      }),
      async execute(_id, params: {
        kind: ObservationKind;
        content: string;
        project?: string;
        workspace?: string;
        meta?: Record<string, unknown>;
      }) {
        const db = initDB();
        try {
          const id = insertObservation(
            db,
            params.project ?? process.env.PROJECT_ID ?? null,
            params.workspace ?? process.env.PROJECT_WORKSPACE ?? null,
            params.kind,
            params.content,
            params.meta ?? null
          );
          return { content: [{ type: "text", text: JSON.stringify({ inserted: true, id }, null, 2) }] };
        } finally {
          db.close();
        }
      },
    });

    api.registerTool({
      name: "memory_maintenance",
      description: "Backfill missing embeddings and report memory health. Intended for heartbeat runs.",
      parameters: Type.Object({ limit: Type.Optional(Type.Number()) }),
      async execute(_id, params: { limit?: number }) {
        const db = initDB();
        try {
          const embedded = await backfillEmbeddings(db, Math.min(params.limit ?? 50, 200));
          const observations = (db.prepare("SELECT COUNT(*) as c FROM observations").get() as { c: number }).c;
          const vectors = (db.prepare("SELECT COUNT(*) as c FROM observations_vec").get() as { c: number }).c;
          return { content: [{ type: "text", text: JSON.stringify({
            observations,
            vectors,
            embeddings_backfilled: embedded,
            vector_recall_ready: vectors > 0,
          }, null, 2) }] };
        } finally {
          db.close();
        }
      },
    });

    api.registerTool({
      name: "raw_observations",
      description: "Denied by DOCK.md policy. Use domain_memory_query or domain_status instead.",
      parameters: Type.Object({}),
      async execute() {
        return { content: [{ type: "text", text: [
          "Denied by DOCK.md export policy.",
          "Raw observations, DB rows, embeddings, and tool-call logs are not exported by default.",
          "Use domain_memory_query for synthesized memory answers or domain_status for aggregate counts.",
        ].join("\n") }] };
      },
    });
  },
});
