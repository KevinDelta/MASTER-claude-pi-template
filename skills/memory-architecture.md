---
name: memory-architecture
description: Reference for the two-layer memory system (pi-memory + agentmemory). Load when setting up memory for a new project, debugging why context isn't surfacing, or choosing between memory search tools.
---

# memory-architecture

## Purpose

Explains how the two-layer memory system works so you can set it up correctly, diagnose problems, and choose the right search tool for the right job. Load this skill when onboarding a new project, troubleshooting missing context, or confused about which memory layer to write to.

---

## The Two Layers

### Layer 1 — Markdown Substrate (pi-memory)

**Location:** `memory/MEMORY.md`, `memory/SCRATCHPAD.md`, `memory/daily/`

**What it is:** Plain markdown files. Permanent. Git-committed. Human-readable. The source of truth for project knowledge.

**What it does:** Pi-memory hooks `before_agent_start` and injects keyword-relevant slices (BM25 search) into the system prompt before every turn. 16K total budget.

**Injection priority:**
1. Open scratchpad items (2K)
2. Today's daily log tail (3K)
3. BM25 search results on current prompt (2.5K)
4. MEMORY.md long-term content (4K)
5. Yesterday's daily log (3K — trimmed first)

**Install:** `pi install npm:pi-memory` (once per machine)

**Always active.** Does not require agentmemory. This layer is the floor.

---

### Layer 2 — Intelligence Layer (agentmemory)

**Location:** `memory/.agentmemory/` (binary KV store, **gitignored**)

**What it is:** A background HTTP service with 4-tier memory consolidation, hybrid semantic/graph/BM25 search, and auto-capture of tool call observations.

**What it does:**
- Captures tool calls (write/edit/bash) as working memory automatically
- Consolidates Working → Episodic → Semantic → Procedural on session end
- Provides semantic search, pattern detection, and knowledge graph traversal
- Optionally syncs consolidated memories back to MEMORY.md via Claude Bridge

**Always optional. Graceful degradation.** The bridge extension checks health at session start. If agentmemory is unavailable, Layer 1 continues uninterrupted.

---

### The Bridge (Claude Bridge)

agentmemory's consolidation can write back to `memory/MEMORY.md` (Layer 1) at session end. This keeps the git-committed record current without manual effort.

**Direction:** agentmemory → MEMORY.md. Never the other way.

**Enable via:** `CLAUDE_BRIDGE_SYNC=true` in `.pi/.env`

**When to enable:** Engagements longer than a week; client projects where MEMORY.md is reviewed; projects where git history of decisions matters.

---

## What Goes Where

| Information | Where to put it | How it gets there |
|-------------|----------------|-------------------|
| Decision + rationale | `MEMORY.md` `#decision` tag | Write manually (memory-write skill) or via Claude Bridge sync |
| Client/team preference | `MEMORY.md` `#preference` tag | Write manually |
| Lesson learned | `MEMORY.md` `#lesson` tag | Write manually |
| Active open item | `SCRATCHPAD.md` | Write manually |
| What was done today | `daily/YYYY-MM-DD.md` | Pi-memory writes on compaction; write manually for explicit closure |
| Tool call observations | `memory/.agentmemory/` | Auto-captured by bridge extension (gitignored) |
| Consolidated patterns | `memory/.agentmemory/` → MEMORY.md | agentmemory consolidation + Claude Bridge sync |

**Rule of thumb:** If it needs to survive the binary store being wiped — write it to MEMORY.md manually. The binary store is regenerable; MEMORY.md is the canonical record.

---

## Setup

### Layer 1 (required)

```bash
pi install npm:pi-memory
```

No other setup. Pi-memory auto-injects on every turn as long as `memory.dir` is set in `.pi/settings.json`.

### Layer 2 (optional)

```bash
# 1. Run agentmemory service
git clone https://github.com/rohitg00/agentmemory
cd agentmemory && docker-compose up -d

# 2. Verify
curl http://localhost:3111/health
# → { "status": "ok" }

# 3. Configure the project
cp .pi/.env.example .pi/.env
# Edit .pi/.env: set AGENTMEMORY_PROJECT_ID, CLAUDE_BRIDGE_SYNC, etc.

# 4. The bridge extension (agentmemory-bridge.ts) is already in .pi/extensions/
# Pi discovers it automatically on next session start.
```

---

## Choosing the Right Search Tool

When you need to go beyond what auto-injection surfaced:

| Goal | Tool | When to use |
|------|------|------------|
| Find specific prior decision or fact | `memory_search(query, mode: "keyword")` | You know the keyword; fast (~30ms) |
| Explore what's known about a topic | `memory_smart_search(query, mode: "hybrid")` | Open-ended; combines BM25 + vector + graph |
| Find how we usually approach something | `memory_patterns(category: "behavior")` | Looking for recurring behavior, not facts |
| Trace what's connected to a concept | `memory_graph_query(concept, depth: 2)` | Following relationships across decisions |
| Full project orientation | `read("memory/MEMORY.md")` | Session start; want the complete picture |

**Note:** `memory_smart_search`, `memory_patterns`, and `memory_graph_query` require agentmemory to be running. `memory_search` and direct `read` always work.

---

## Diagnosing Missing Context

If relevant context isn't surfacing in a session, work through this checklist:

**Layer 1 (pi-memory)**
- [ ] Is `memory.dir` set correctly in `.pi/settings.json`?
- [ ] Does `memory/MEMORY.md` contain the relevant information?
- [ ] Is the relevant info tagged correctly (`#decision`, `#pattern`, etc.)?
- [ ] Is pi-memory installed? (`pi install npm:pi-memory` if not)

**Layer 2 (agentmemory)**
- [ ] Is the agentmemory service running? (`curl http://localhost:3111/health`)
- [ ] Is `AGENTMEMORY_PROJECT_ID` set correctly in `.pi/.env`?
- [ ] Did the bridge extension connect? (Check session start log for "agentmemory-bridge: connected")
- [ ] Has enough been captured to recall? (New projects have sparse observations for the first few sessions)

**Both layers**
- [ ] Is the information actually written down anywhere? If not, write it now (memory-write skill).
- [ ] Is the query specific enough? Vague queries return vague results. Use terms from MEMORY.md tags and topic names.
