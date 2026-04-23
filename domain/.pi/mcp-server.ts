/**
 * mcp-server.ts — Pi domain MCP server (FastMCP, v3)
 *
 * Transport: stdio (default) or HTTP+SSE (PI_MCP_TRANSPORT=http)
 *
 * Run with tsx (no compile step):
 *   npx tsx ~/.pi/domain/<name>/.pi/mcp-server.ts
 *
 * Prerequisites (install once per machine):
 *   npm install -g fastmcp better-sqlite3 sqlite-vec tsx
 *
 * Register with Claude Desktop:
 *   ~/Library/Application Support/Claude/claude_desktop_config.json:
 *   {
 *     "mcpServers": {
 *       "pi-<domain>": {
 *         "command": "npx",
 *         "args": ["tsx", "/Users/<you>/.pi/domain/<name>/.pi/mcp-server.ts"],
 *         "env": { "PI_DOMAIN_NAME": "<name>" }
 *       }
 *     }
 *   }
 *
 * Env vars:
 *   PI_DOMAIN_NAME      required — matches ~/.pi/domain/<name>/
 *   PI_DOMAIN_DB_PATH   optional — override default memory.db path
 *   OLLAMA_URL          optional — default http://localhost:11434
 *   PI_MCP_TRANSPORT    stdio | http — default stdio
 *   PI_MCP_PORT         port when http — default 3222
 *   PI_WORKER_TOKEN     required when PI_MCP_TRANSPORT=http
 *
 * Allowlist (per PI_DOCK.md Section B):
 *   domain_info, list_active_projects, list_skills,
 *   query_memory, get_scratchpad, get_domain_status
 *
 * Hard-rejected: get_raw_observations
 */

import { FastMCP, UserError } from "fastmcp";
import { z } from "zod";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

// ─── configuration ─────────────────────────────────────────────────────────────

const DOMAIN_NAME = process.env.PI_DOMAIN_NAME ?? "default";
const DOMAIN_DIR = path.join(os.homedir(), ".pi", "domain", DOMAIN_NAME);
const DB_PATH = process.env.PI_DOMAIN_DB_PATH ?? path.join(DOMAIN_DIR, "memory.db");
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const SKILLS_DIR = path.join(DOMAIN_DIR, "skills");
const TRANSPORT = process.env.PI_MCP_TRANSPORT === "http" ? "httpStream" : "stdio";
const PORT = Number(process.env.PI_MCP_PORT ?? 3222);

// ─── db helpers ────────────────────────────────────────────────────────────────

function openDB(): Database.Database | null {
  if (!fs.existsSync(DB_PATH)) return null;
  try {
    const db = new Database(DB_PATH, { readonly: true });
    sqliteVec.load(db);
    return db;
  } catch {
    return null;
  }
}

function requireDB(): Database.Database {
  const db = openDB();
  if (!db) throw new UserError(`Memory DB not found at ${DB_PATH}. Run a pi session first to initialize the DB.`);
  return db;
}

function searchFTS(db: Database.Database, query: string, limit: number): string[] {
  try {
    const safe = query.replace(/['"*^()]/g, " ").trim();
    if (!safe) return [];
    return (
      db.prepare(`
        SELECT content FROM observations_fts
        WHERE observations_fts MATCH ?
        ORDER BY rank LIMIT ?
      `).all(safe, limit) as { content: string }[]
    ).map((r) => r.content);
  } catch {
    return [];
  }
}

async function computeEmbedding(text: string): Promise<number[] | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/embeddings`, {
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
    return (
      db.prepare(`
        SELECT o.content
        FROM observations_vec v
        JOIN observations o ON o.id = v.observation_id
        WHERE v.embedding MATCH ?
        ORDER BY v.distance LIMIT ?
      `).all(JSON.stringify(embedding), limit) as { content: string }[]
    ).map((r) => r.content);
  } catch {
    return [];
  }
}

function readSkills(): Array<{ name: string; description: string }> {
  if (!fs.existsSync(SKILLS_DIR)) return [];
  const skills: Array<{ name: string; description: string }> = [];
  for (const file of fs.readdirSync(SKILLS_DIR)) {
    if (!file.endsWith(".md")) continue;
    try {
      const content = fs.readFileSync(path.join(SKILLS_DIR, file), "utf8");
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) continue;
      const nameMatch = fmMatch[1].match(/^name:\s*(.+)$/m);
      const descMatch = fmMatch[1].match(/^description:\s*(.+)$/m);
      if (nameMatch && descMatch) {
        skills.push({ name: nameMatch[1].trim(), description: descMatch[1].trim() });
      }
    } catch {
      continue;
    }
  }
  return skills;
}

const DENY_TEXT = [
  "Tool 'get_raw_observations' is not on the PI_DOCK.md export allowlist.",
  "",
  "Per the export policy (PI_DOCK.md Section B), the following are denied without explicit worker confirmation:",
  "  - Raw observation logs or DB excerpts",
  "  - Session histories or tool call records",
  "  - File contents from project directories",
  "  - Client names or project details to unauthorized hosts",
  "",
  "Use 'query_memory' to ask questions about domain memory. Pi returns relevant context chunks, not raw rows.",
].join("\n");

// ─── server ────────────────────────────────────────────────────────────────────

const server = new FastMCP({
  name: `pi-${DOMAIN_NAME}`,
  version: "3.0.0",
  ...(TRANSPORT === "httpStream" && {
    authenticate: async (req: { headers: { authorization?: string } }) => {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (token !== process.env.PI_WORKER_TOKEN) throw new Error("Unauthorized");
    },
  }),
});

server.addTool({
  name: "domain_info",
  description: "Returns domain name, persona name, and active project count. Does not expose raw DB or file contents.",
  parameters: z.object({}),
  execute: async () => {
    const db = requireDB();
    try {
      const meta = db.prepare("SELECT domain_name, created_at, embedding_model FROM _meta LIMIT 1").get() as
        | { domain_name: string; created_at: string; embedding_model: string }
        | undefined;

      let personaName = "not configured";
      const soulPath = path.join(DOMAIN_DIR, "SOUL.md");
      if (fs.existsSync(soulPath)) {
        const soulContent = fs.readFileSync(soulPath, "utf8");
        const nameMatch = soulContent.match(/^\*\*Name:\*\*\s*(.+)$/m);
        if (nameMatch) personaName = nameMatch[1].trim();
      }

      const projectCount = (
        db.prepare("SELECT COUNT(DISTINCT project) as c FROM observations WHERE project IS NOT NULL").get() as { c: number }
      ).c;

      return JSON.stringify({
        domain: meta?.domain_name ?? DOMAIN_NAME,
        persona: personaName,
        embedding_model: meta?.embedding_model ?? "nomic-embed-text",
        created_at: meta?.created_at ?? null,
        project_count: projectCount,
      }, null, 2);
    } finally {
      db.close();
    }
  },
});

server.addTool({
  name: "list_active_projects",
  description: "Returns project slugs with last activity date and observation count. No file contents.",
  parameters: z.object({
    days: z.number().optional().describe("Lookback window in days (default: 90)"),
  }),
  execute: async ({ days = 90 }) => {
    const db = requireDB();
    try {
      const rows = db.prepare(`
        SELECT project,
               MAX(ts) as last_activity,
               COUNT(*) as observation_count
        FROM observations
        WHERE project IS NOT NULL
          AND ts > datetime('now', ? || ' days')
        GROUP BY project
        ORDER BY last_activity DESC
      `).all(`-${days}`) as { project: string; last_activity: string; observation_count: number }[];
      return JSON.stringify({ projects: rows, lookback_days: days }, null, 2);
    } finally {
      db.close();
    }
  },
});

server.addTool({
  name: "list_skills",
  description: "Returns skill names and descriptions. Does not return skill file contents.",
  parameters: z.object({}),
  execute: async () => {
    return JSON.stringify({ skills: readSkills(), note: "File contents not exported per allowlist." }, null, 2);
  },
});

server.addTool({
  name: "query_memory",
  description: "Search domain memory using FTS and vector search. Returns relevant content chunks — not raw rows. The host LLM synthesizes answers from the returned chunks.",
  parameters: z.object({
    query: z.string().describe("The question or topic to search for"),
    limit: z.number().optional().describe("Max results to return (default: 10)"),
  }),
  execute: async ({ query, limit = 10 }) => {
    const db = requireDB();
    try {
      const cap = Math.min(limit, 20);
      const ftsResults = searchFTS(db, query, cap);
      const embedding = await computeEmbedding(query);
      const vecResults = embedding ? searchVec(db, embedding, cap) : [];

      const seen = new Set<string>();
      const merged: string[] = [];
      for (const c of [...vecResults, ...ftsResults]) {
        if (!seen.has(c)) { seen.add(c); merged.push(c); }
      }

      return JSON.stringify({
        query,
        search_mode: embedding ? "vector+fts" : "fts_only",
        result_count: merged.length,
        results: merged.slice(0, cap),
        note: "Raw observation content returned. Host LLM synthesizes the answer.",
      }, null, 2);
    } finally {
      db.close();
    }
  },
});

server.addTool({
  name: "get_scratchpad",
  description: "Returns open scratchpad items. Optionally filtered by project.",
  parameters: z.object({
    project: z.string().optional().describe("Filter by project slug (omit for all projects)"),
  }),
  execute: async ({ project }) => {
    const db = requireDB();
    try {
      const rows = project
        ? db.prepare(`
            SELECT project, item, created_at FROM scratchpad
            WHERE project = ? AND completed_at IS NULL
            ORDER BY created_at DESC
          `).all(project) as { project: string; item: string; created_at: string }[]
        : db.prepare(`
            SELECT project, item, created_at FROM scratchpad
            WHERE completed_at IS NULL
            ORDER BY created_at DESC
          `).all() as { project: string; item: string; created_at: string }[];
      return JSON.stringify({ items: rows, count: rows.length }, null, 2);
    } finally {
      db.close();
    }
  },
});

server.addTool({
  name: "get_domain_status",
  description: "Returns structured domain stats: observation counts by kind, pending deferred tasks, active goal count, and projects active in the last N days.",
  parameters: z.object({
    days: z.number().optional().describe("Lookback window for activity stats (default: 30)"),
  }),
  execute: async ({ days = 30 }) => {
    const db = requireDB();
    try {
      const kindCounts = db.prepare(`
        SELECT kind, COUNT(*) as count FROM observations
        WHERE ts > datetime('now', ? || ' days')
        GROUP BY kind ORDER BY count DESC
      `).all(`-${days}`) as { kind: string; count: number }[];

      const activeProjects = (
        db.prepare(`
          SELECT COUNT(DISTINCT project) as c FROM observations
          WHERE project IS NOT NULL AND ts > datetime('now', ? || ' days')
        `).get(`-${days}`) as { c: number }
      ).c;

      const pendingDeferred = (
        db.prepare("SELECT COUNT(*) as c FROM deferred_tasks WHERE completed_at IS NULL").get() as { c: number }
      ).c;

      const openScratchpad = (
        db.prepare("SELECT COUNT(*) as c FROM scratchpad WHERE completed_at IS NULL").get() as { c: number }
      ).c;

      const goalCount = (
        db.prepare("SELECT COUNT(*) as c FROM goals").get() as { c: number }
      ).c;

      return JSON.stringify({
        lookback_days: days,
        active_projects: activeProjects,
        observations_by_kind: kindCounts,
        open_scratchpad_items: openScratchpad,
        pending_deferred_tasks: pendingDeferred,
        active_goals: goalCount,
      }, null, 2);
    } finally {
      db.close();
    }
  },
});

server.addTool({
  name: "get_raw_observations",
  description: "NOT ON ALLOWLIST — hard-rejected. Use query_memory instead.",
  parameters: z.object({}),
  execute: async () => {
    throw new UserError(DENY_TEXT);
  },
});

// ─── start ─────────────────────────────────────────────────────────────────────

server.start(
  TRANSPORT === "httpStream"
    ? { transportType: "httpStream", httpStream: { port: PORT } }
    : { transportType: "stdio" }
);
