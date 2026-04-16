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
const TOKEN_BUDGET = parseInt(process.env.AGENTMEMORY_TOKEN_BUDGET ?? "2000", 10) || 2000;
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

// ─── extension factory ───────────────────────────────────────────────────────

export default function (pi: ExtensionAPI): void {
  /**
   * session_start — runs when pi loads the session.
   * Checks agentmemory health and sets the `available` flag used by all other hooks.
   */
  pi.on("session_start", async (_event, _ctx) => {
    available = await checkHealth();
    if (available) {
      console.log(`agentmemory-bridge: connected → ${AGENTMEMORY_URL} (project: ${PROJECT_ID})`);
    } else {
      console.log(
        `agentmemory-bridge: service unavailable at ${AGENTMEMORY_URL} — pi-memory continues uninterrupted`
      );
    }
  });

  /**
   * before_agent_start — fires before every agent turn.
   * Injects semantically recalled memory into the system prompt.
   * Complements pi-memory's BM25 injection with vector + graph search.
   * Returns { systemPrompt } to append recalled context to the current system prompt.
   */
  pi.on("before_agent_start", async (event, _ctx) => {
    if (!available) return;
    const query = event.prompt;
    if (!query) return;

    const recalled = await recallMemory(query);
    if (!recalled) return;

    return {
      systemPrompt:
        event.systemPrompt +
        `\n\n<!-- agentmemory semantic recall -->\n${recalled}\n<!-- end agentmemory recall -->`,
    };
  });

  /**
   * tool_call — fires before every tool execution.
   * Captures write/edit/bash calls as working memory observations.
   * Skipped for read-only tools and memory tools to avoid feedback loops.
   */
  pi.on("tool_call", async (event, _ctx) => {
    if (!available || !AUTO_CAPTURE) return;
    if (SKIP_CAPTURE_TOOLS.has(event.toolName)) return;

    const summary = `Tool: ${event.toolName}\nArgs: ${JSON.stringify(event.input).slice(0, 500)}`;
    await saveObservation(summary);
  });

  /**
   * agent_end — fires when the agent loop completes.
   * Consolidates Working → Episodic → Semantic → Procedural tiers,
   * then optionally syncs consolidated memories back to MEMORY.md via Claude Bridge.
   */
  pi.on("agent_end", async (_event, _ctx) => {
    if (!available) return;
    await consolidateMemory();
    await syncBridge();
  });
}
