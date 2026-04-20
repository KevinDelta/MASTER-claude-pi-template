/**
 * mcp-server.ts
 *
 * Standalone MCP server for the pi domain layer.
 * Exposes domain memory, scratchpad, skills, and status as MCP tools.
 * Transport: stdio.
 *
 * Run with tsx (no compile step):
 *   npx tsx ~/.pi/domain/<name>/.pi/mcp-server.ts
 *
 * Prerequisites (install once per machine):
 *   npm install -g better-sqlite3 sqlite-vec @modelcontextprotocol/sdk tsx
 *
 * Register with Claude Desktop manually — do not automate this step.
 * Add to ~/Library/Application Support/Claude/claude_desktop_config.json:
 *
 *   {
 *     "mcpServers": {
 *       "pi-<domain-name>": {
 *         "command": "npx",
 *         "args": ["tsx", "/Users/<you>/.pi/domain/<name>/.pi/mcp-server.ts"],
 *         "env": {
 *           "PI_DOMAIN_NAME": "<name>"
 *         }
 *       }
 *     }
 *   }
 *
 * Configuration (reads from same .env as memory-db.ts):
 *   PI_DOMAIN_NAME    — required; matches ~/.pi/domain/<name>/ directory
 *   PI_DOMAIN_DB_PATH — optional; override default memory.db path
 *   OLLAMA_URL        — optional; for vector search (default: http://localhost:11434)
 *
 * Allowlist: derived from PI_DOCK.md Section B.
 * Tools not on the allowlist hard-reject with a descriptive error.
 * The raw DB is never exposed — only query results and structured metadata.
 *
 * Tools exposed:
 *   domain_info          — domain name, persona name, active project count
 *   list_active_projects — project slugs with last activity and observation count
 *   list_skills          — skill names and descriptions (no file contents)
 *   query_memory         — FTS + vector search; returns relevant content chunks
 *   get_scratchpad       — open scratchpad items (optionally filtered by project)
 *   get_domain_status    — structured stats: observation counts by kind, pending tasks, goal count
 *
 * Tools hard-rejected (not on allowlist):
 *   get_raw_observations — raw DB rows; denied per PI_DOCK.md export policy
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";

// ─── configuration ─────────────────────────────────────────────────────────────

const DOMAIN_NAME = process.env.PI_DOMAIN_NAME ?? "default";
const DOMAIN_DIR = path.join(os.homedir(), ".pi", "domain", DOMAIN_NAME);
const DEFAULT_DB_PATH = path.join(DOMAIN_DIR, "memory.db");
const DB_PATH = process.env.PI_DOMAIN_DB_PATH ?? DEFAULT_DB_PATH;
const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const SKILLS_DIR = path.join(DOMAIN_DIR, "skills");

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

// ─── skill frontmatter parser ───────────────────────────────────────────────────

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

// ─── hard-reject helper ─────────────────────────────────────────────────────────

function denied(toolName: string): { content: Array<{ type: "text"; text: string }>; isError: true } {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: [
          `Tool '${toolName}' is not on the PI_DOCK.md export allowlist.`,
          "",
          "Per the export policy (PI_DOCK.md Section B), the following are denied without explicit worker confirmation:",
          "  - Raw observation logs or DB excerpts",
          "  - Session histories or tool call records",
          "  - File contents from project directories",
          "  - Client names or project details to unauthorized hosts",
          "",
          "Use 'query_memory' to ask questions about domain memory. Pi returns relevant context chunks, not raw rows.",
        ].join("\n"),
      },
    ],
  };
}

// ─── server ────────────────────────────────────────────────────────────────────

const server = new Server(
  { name: `pi-${DOMAIN_NAME}`, version: "2.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "domain_info",
      description: "Returns domain name, persona name, and active project count. Does not expose raw DB or file contents.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "list_active_projects",
      description: "Returns project slugs with last activity date and observation count. No file contents.",
      inputSchema: {
        type: "object",
        properties: {
          days: { type: "number", description: "Lookback window in days (default: 90)" },
        },
      },
    },
    {
      name: "list_skills",
      description: "Returns skill names and descriptions. Does not return skill file contents.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "query_memory",
      description: "Search domain memory using FTS and vector search. Returns relevant content chunks — not raw rows. The host LLM synthesizes answers from the returned chunks.",
      inputSchema: {
        type: "object",
        required: ["query"],
        properties: {
          query: { type: "string", description: "The question or topic to search for" },
          limit: { type: "number", description: "Max results to return (default: 10)" },
        },
      },
    },
    {
      name: "get_scratchpad",
      description: "Returns open scratchpad items. Optionally filtered by project.",
      inputSchema: {
        type: "object",
        properties: {
          project: { type: "string", description: "Filter by project slug (omit for all projects)" },
        },
      },
    },
    {
      name: "get_domain_status",
      description: "Returns structured domain stats: observation counts by kind, pending deferred tasks, active goal count, and projects active in the last N days.",
      inputSchema: {
        type: "object",
        properties: {
          days: { type: "number", description: "Lookback window for activity stats (default: 30)" },
        },
      },
    },
    {
      name: "get_raw_observations",
      description: "NOT ON ALLOWLIST — will be hard-rejected. Use query_memory instead.",
      inputSchema: { type: "object", properties: {} },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const a = (args ?? {}) as Record<string, unknown>;

  if (name === "get_raw_observations") {
    return denied("get_raw_observations");
  }

  const db = openDB();
  if (!db) {
    return {
      isError: true,
      content: [{ type: "text", text: `Memory DB not found at ${DB_PATH}. Run a pi session first to initialize the DB.` }],
    };
  }

  try {
    // ── domain_info ────────────────────────────────────────────────────────────
    if (name === "domain_info") {
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

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                domain: meta?.domain_name ?? DOMAIN_NAME,
                persona: personaName,
                embedding_model: meta?.embedding_model ?? "nomic-embed-text",
                created_at: meta?.created_at ?? null,
                project_count: projectCount,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ── list_active_projects ───────────────────────────────────────────────────
    if (name === "list_active_projects") {
      const days = typeof a.days === "number" ? a.days : 90;
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

      return {
        content: [{ type: "text", text: JSON.stringify({ projects: rows, lookback_days: days }, null, 2) }],
      };
    }

    // ── list_skills ────────────────────────────────────────────────────────────
    if (name === "list_skills") {
      const skills = readSkills();
      return {
        content: [{ type: "text", text: JSON.stringify({ skills, note: "File contents not exported per allowlist." }, null, 2) }],
      };
    }

    // ── query_memory ───────────────────────────────────────────────────────────
    if (name === "query_memory") {
      const query = typeof a.query === "string" ? a.query : "";
      const limit = typeof a.limit === "number" ? Math.min(a.limit, 20) : 10;
      if (!query) {
        return { isError: true, content: [{ type: "text", text: "query parameter is required." }] };
      }

      const ftsResults = searchFTS(db, query, limit);
      const embedding = await computeEmbedding(query);
      const vecResults = embedding ? searchVec(db, embedding, limit) : [];

      const seen = new Set<string>();
      const merged: string[] = [];
      for (const c of [...vecResults, ...ftsResults]) {
        if (!seen.has(c)) { seen.add(c); merged.push(c); }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                query,
                search_mode: embedding ? "vector+fts" : "fts_only",
                result_count: merged.length,
                results: merged.slice(0, limit),
                note: "Raw observation content returned. Host LLM synthesizes the answer.",
              },
              null,
              2
            ),
          },
        ],
      };
    }

    // ── get_scratchpad ─────────────────────────────────────────────────────────
    if (name === "get_scratchpad") {
      const project = typeof a.project === "string" ? a.project : null;
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

      return {
        content: [{ type: "text", text: JSON.stringify({ items: rows, count: rows.length }, null, 2) }],
      };
    }

    // ── get_domain_status ──────────────────────────────────────────────────────
    if (name === "get_domain_status") {
      const days = typeof a.days === "number" ? a.days : 30;

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
        db.prepare(`
          SELECT COUNT(*) as c FROM deferred_tasks WHERE completed_at IS NULL
        `).get() as { c: number }
      ).c;

      const openScratchpad = (
        db.prepare("SELECT COUNT(*) as c FROM scratchpad WHERE completed_at IS NULL").get() as { c: number }
      ).c;

      const goalCount = (
        db.prepare("SELECT COUNT(*) as c FROM goals").get() as { c: number }
      ).c;

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                lookback_days: days,
                active_projects: activeProjects,
                observations_by_kind: kindCounts,
                open_scratchpad_items: openScratchpad,
                pending_deferred_tasks: pendingDeferred,
                active_goals: goalCount,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    return {
      isError: true,
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
    };
  } finally {
    db.close();
  }
});

// ─── start ─────────────────────────────────────────────────────────────────────

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stdio server runs until the host closes the connection
}

main().catch((err) => {
  process.stderr.write(`mcp-server fatal: ${err}\n`);
  process.exit(1);
});
