/**
 * agentmemory-bridge.ts
 *
 * Pi extension: connects to a running agentmemory service (github.com/rohitg00/agentmemory)
 * via HTTP and adds a semantic intelligence layer on top of pi-memory's BM25 injection.
 *
 * What this does:
 *   session_start      — health check; sets availability flag; logs status
 *   before_agent_start — injects semantically recalled memory into the system prompt
 *   tool_call          — captures write/edit/bash calls as working memory observations
 *   agent_end          — consolidates memory tiers then syncs back to MEMORY.md via Bridge
 *
 * Graceful degradation: every network call is wrapped in try/catch with a timeout.
 * If agentmemory is unavailable, pi-memory continues uninterrupted. Nothing throws.
 *
 * Configuration (via .pi/.env):
 *   AGENTMEMORY_URL          — service URL (default: http://localhost:3111)
 *   AGENTMEMORY_PROJECT_ID   — project namespace for memory isolation
 *   AGENTMEMORY_TOKEN_BUDGET — tokens to inject from semantic recall (default: 2000)
 *   AGENTMEMORY_AUTO_CAPTURE — capture tool calls as observations (default: true)
 *   CLAUDE_BRIDGE_SYNC       — sync consolidated memory back to MEMORY.md (default: false)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const AGENTMEMORY_URL = process.env.AGENTMEMORY_URL ?? "http://localhost:3111";
const AUTO_CAPTURE = process.env.AGENTMEMORY_AUTO_CAPTURE !== "false";
const TOKEN_BUDGET = parseInt(process.env.AGENTMEMORY_TOKEN_BUDGET ?? "2000", 10);
const PROJECT_ID = process.env.AGENTMEMORY_PROJECT_ID ?? "default";

// Tools that should never be captured as observations.
// Read-only tools generate noise without signal; memory tools would loop.
const SKIP_CAPTURE_TOOLS = new Set([
  "read",
  "memory_read",
  "memory_search",
  "memory_recall",
  "memory_smart_search",
  "memory_patterns",
  "memory_graph_query",
]);

let available = false;

// ─── helpers ────────────────────────────────────────────────────────────────

async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${AGENTMEMORY_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function recallMemory(query: string): Promise<string> {
  try {
    const res = await fetch(`${AGENTMEMORY_URL}/api/memory/recall`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        project_id: PROJECT_ID,
        token_budget: TOKEN_BUDGET,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return "";
    const data = (await res.json()) as { content?: string };
    return data.content ?? "";
  } catch {
    return "";
  }
}

async function saveObservation(content: string): Promise<void> {
  try {
    await fetch(`${AGENTMEMORY_URL}/api/observations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        project_id: PROJECT_ID,
        tier: "working",
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    // silent — observation loss is acceptable
  }
}

async function consolidateMemory(): Promise<void> {
  try {
    await fetch(`${AGENTMEMORY_URL}/api/memory/consolidate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: PROJECT_ID }),
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    // silent — consolidation can happen on next session
  }
}

async function syncBridge(): Promise<void> {
  if (process.env.CLAUDE_BRIDGE_SYNC !== "true") return;
  try {
    await fetch(`${AGENTMEMORY_URL}/api/bridge/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_id: PROJECT_ID,
        memory_file: "memory/MEMORY.md",
      }),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    // silent — MEMORY.md stays at last synced state
  }
}

// ─── extension hooks ─────────────────────────────────────────────────────────

export default function (): Partial<ExtensionAPI> {
  return {
    /**
     * session_start — runs when pi loads the session.
     * Checks agentmemory health and sets the `available` flag used by all other hooks.
     */
    async session_start(_event: unknown, ctx: ExtensionAPI) {
      available = await checkHealth();
      if (available) {
        ctx.log(`agentmemory-bridge: connected → ${AGENTMEMORY_URL} (project: ${PROJECT_ID})`);
      } else {
        ctx.log(
          `agentmemory-bridge: service unavailable at ${AGENTMEMORY_URL} — pi-memory continues uninterrupted`
        );
      }
    },

    /**
     * before_agent_start — fires before every agent turn.
     * Injects semantically recalled memory into the system prompt prefix.
     * Complements pi-memory's BM25 injection with vector + graph search.
     */
    async before_agent_start(_event: unknown, ctx: ExtensionAPI) {
      if (!available) return;
      const query = (ctx as any).getLastUserMessage?.() ?? "";
      if (!query) return;

      const recalled = await recallMemory(query);
      if (!recalled) return;

      (ctx as any).prependSystemPrompt?.(
        `\n\n<!-- agentmemory semantic recall -->\n${recalled}\n<!-- end agentmemory recall -->\n`
      );
    },

    /**
     * tool_call — fires before every tool execution.
     * Captures write/edit/bash calls as working memory observations.
     * Skipped for read-only tools and memory tools to avoid feedback loops.
     */
    async tool_call(_event: unknown, ctx: ExtensionAPI) {
      if (!available || !AUTO_CAPTURE) return;
      const tool = (ctx as any).getCurrentTool?.();
      if (!tool) return;
      if (SKIP_CAPTURE_TOOLS.has(tool.name)) return;

      const summary = `Tool: ${tool.name}\nArgs: ${JSON.stringify(tool.args ?? {}).slice(0, 500)}`;
      await saveObservation(summary);
    },

    /**
     * agent_end — fires when the agent loop completes.
     * Consolidates Working → Episodic → Semantic → Procedural tiers,
     * then optionally syncs consolidated memories back to MEMORY.md via Claude Bridge.
     */
    async agent_end(_event: unknown, _ctx: ExtensionAPI) {
      if (!available) return;
      await consolidateMemory();
      await syncBridge();
    },
  };
}
