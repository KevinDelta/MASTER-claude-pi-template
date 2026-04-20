# SPEC v2 — Domain Layer, Embedded Memory DB, Dock Interface, Proactivity

**Status:** Substantially implemented. Domain template, memory-db extension, PI_DOCK.md, watches, scheduler, and install.sh all shipped. Two open items: (1) upstream `pi serve --as-mcp` contribution to pi.dev — required to activate the host plug-in model; (2) multi-device sync not yet documented. See Section 10 build order and PROJECT-CONTEXT.md open items.

---

## 1. Vision update

### Current state (v1)

MASTER-claude-pi-template is a file-based template system. A worker copies the `base/` directory into a project repo, fills in context files and AGENTS.md, and drops a pi.dev agent into it. The agent reads the files and knows how to work. No database, no external memory server, no special infrastructure. Memory lives in markdown. The unit is one project.

### Target state (v2)

The unit is one knowledge worker with a declared domain, not one project. The worker's configured agent — their pi — travels between engagements and between host environments. Memory accumulates across projects in an embedded DB. The system watches state against declared goals and acts when it detects a delta.

**The packaged product** is the five-component framework + pi.dev + three-layer AGENTS.md, installed as a bundle on the worker's machine. Pi.dev is the reference implementation harness. The file layout (three-layer AGENTS.md), DB schema, PI_DOCK contract, and watches.yaml schema define the durable spec — another harness can implement the same spec if pi.dev is ever superseded. Worker portability survives any single harness's lifecycle.

---

## 2. Architecture at a glance

Five components. All lightweight. All travel with the worker.

1. **Three-layer AGENTS.md**: global (machine) + domain (worker) + project (engagement)
2. **Embedded memory DB**: SQLite + sqlite-vec for v1; LanceDB as the planned migration target
3. **PI_DOCK.md**: declares what pi carries and what it exports to a host via MCP server mode
4. **Declarative watches**: domain-level state checks that fire pi sessions on triggers
5. **Scheduler surface**: cron / launchd / systemd hooks configured once per machine

---

## 3. Three-layer AGENTS.md

| Layer | Location | Scope | Contents |
|-------|----------|-------|----------|
| Global | `~/.pi/agent/AGENTS.md` | Machine-wide | Org identity, baseline tone, universal standards |
| Domain | `~/.pi/domain/<domain-name>/AGENTS.md` | All projects in one declared domain | Domain vocabulary, methods, routing table scaffold, workspace templates |
| Project | `<project-root>/AGENTS.md` | One engagement | Client, scope, current state, routing overrides |

**Pi load order:** global → active domain → project. Each layer appends or overrides the one above.

**Declaring the active domain:** `~/.pi/active-domain` is a pointer file. The worker switches with `pi domain use <name>`. Most knowledge workers run one at a time.

**Composition rules:**
- Global routing rows survive unless the domain overrides them by task-type key
- Domain routing rows survive unless the project overrides them
- Project files never modify domain or global layers at runtime

---

## 4. Embedded memory DB

**Choice for v1:** SQLite + sqlite-vec. Single file. No install. Every language has a driver.

**Planned migration target:** LanceDB. Native object-storage backends (S3, R2, GCS) enable the multi-device story cleanly. Migration path is documented in Section 15.

**Location:** `~/.pi/domain/<domain-name>/memory.db`. One file per domain. Projects write into the same DB tagged by project ID.

**Domain identity:** A `_meta` table stores the domain name so the DB is self-identifying when moved to another machine.

### Schema

```sql
-- domain identity; one row
CREATE TABLE _meta (
  domain_name TEXT NOT NULL,
  created_at TIMESTAMP,
  embedding_model TEXT DEFAULT 'nomic-embed-text'
);

-- raw session events, tool calls, captures
CREATE TABLE observations (
  id INTEGER PRIMARY KEY,
  ts TIMESTAMP,
  project TEXT,        -- project id; null for cross-project entries
  workspace TEXT,
  kind TEXT,           -- 'tool_call' | 'decision' | 'note' | 'log' | 'compact_summary' | 'error'
  content TEXT,
  meta JSON
);

-- vector search (768 dims for nomic-embed-text)
CREATE VIRTUAL TABLE observations_vec USING vec0(
  observation_id INTEGER PRIMARY KEY,
  embedding FLOAT[768]
);

-- keyword search
CREATE VIRTUAL TABLE observations_fts USING fts5(
  content, project, workspace, kind,
  content=observations
);

-- active checklist across projects
CREATE TABLE scratchpad (
  id INTEGER PRIMARY KEY,
  project TEXT,
  item TEXT,
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);

-- Tasks queued for a future session; injected by before_agent_start when due
CREATE TABLE deferred_tasks (
  id           INTEGER PRIMARY KEY,
  project      TEXT,
  task         TEXT NOT NULL,
  due_date     TEXT,      -- ISO date; NULL = inject on next session
  created_at   TIMESTAMP,
  completed_at TIMESTAMP
);

-- Ideal State the worker declares; referenced by watches
CREATE TABLE goals (
  id INTEGER PRIMARY KEY,
  scope TEXT,           -- 'domain' | 'project'
  project TEXT,         -- null for domain-scoped goals
  name TEXT,
  definition TEXT,      -- prose description of ideal state
  check_cron TEXT,      -- how often to check
  resolver_skill TEXT   -- which skill runs to close a detected delta
);
```

### Pi extension replacing the agentmemory bridge

| Hook | Behavior |
|------|----------|
| `session_start` | Open DB, initialize schema, log connection status. |
| `before_agent_start` | FTS + vector search on current prompt. Inject top N slices (16K budget). Inject open scratchpad items and deferred tasks due today. |
| `tool_call` | Capture `tool_call` observation rows. Tag with workspace and phase. |
| `tool_call_error` | Capture `error` observation rows with tool name, error message, workspace, phase. |
| `session_compact` | Snapshot open scratchpad, active goals, and recent decisions as a `compact_summary` observation before context compression. |
| `agent_end` | Compute embeddings via local model. Optionally append session summary (+ pending deferred task count) to `MEMORY.md`. |

**What stays as markdown:** `MEMORY.md` as a curated, human-readable index and decisions log. The DB is the working substrate. Markdown is the record a human can read without a query tool.

---

## 5. PI_DOCK.md — the host interface

Every worker's pi has one `PI_DOCK.md` at `~/.pi/PI_DOCK.md`. Three sections.

### A. What pi carries

```markdown
## Carried
- Domain: <name>
- Persona: <required — set at domain creation>
- Active projects: <list>
- Memory DB: local only, never exported raw
- Skills: <list>
```

### B. Export allowlist

```markdown
## Export allowlist

When plugged into a host, pi exports only:
- Domain name and prose description
- Active project names (if the host is scoped to one, only that)
- Skills by name and description (not file contents unless requested)
- Memory queries: pi answers questions. Raw DB never leaves the worker's machine.

Default deny. Any request outside this list triggers a confirmation prompt.
```

### C. Host requirements

```markdown
## Host requirements
- Tool access: pi expects MCP endpoints for host-provided capabilities
- Permissions: host declares which tools it exposes to pi
- Network: pi needs outbound access to <APIs the domain uses>
- Workspace: host provides a working directory pi can write to
```

**MCP is the dock protocol.** When plugging into a host, pi runs in MCP server mode (`pi serve --as-mcp` or equivalent). The host connects to pi's MCP server and receives structured answers from the worker's domain. The raw DB never leaves the worker's machine. The host sees what PI_DOCK.md declares, nothing more.

---

## 6. Proactivity — declarative watches

Akin (for reference and best practices) to HEARTBEAT.md in the OpenClaw docs.

Proactivity lives in the domain layer, not the project layer. A project is too short-lived to justify a watch. A domain persists.

### The watch file

`~/.pi/domain/<domain-name>/watches.yaml`

```yaml
watches:
  - name: morning-plan
    schedule: "0 7 * * *"
    task: "Review calendar. Check scratchpad. Draft daily plan."
    output: notify

  - name: weekly-sync
    schedule: "0 17 * * 5"
    task: "Summarize the week across active projects. Flag open items."
    output: append MEMORY.md

  - name: stale-project-check
    schedule: "0 9 * * 1"
    condition: "any project with no observations in 14 days"
    task: "Flag stale projects. Ask the worker whether to archive or resume."
    output: notify

  - name: deep-work-goal-check
    schedule: "0 18 * * *"
    goal: deep-work-hours-per-week
    task: "Compare this week's deep-work hours to target. If below 75%, propose tomorrow's schedule adjustments."
    output: notify
```

### How watches fire

A single launchd (macOS) or systemd (Linux) entry per worker reads `watches.yaml` and invokes `pi --task "<task>" --output <channel>`. Pi runs headless with full domain context loaded. Pi exits when done.

**No daemon.** The OS scheduler fires pi. No long-running process. Consistent with the VM model.

### Current state vs ideal state

The `goals` table holds Ideal State. A watch referencing a goal compares observed state (from `observations`) against the goal. If the check finds a delta, the resolver skill runs.

Example: `deep-work-hours-per-week` goal is 20 hours. Friday's watch queries observations tagged `deep-work` for the week. Returns 14. Delta detected. Resolver skill drafts Monday's schedule to recover the 6-hour gap.

---

## 7. File structure post-spec

CONTEXT.md files and the workspace philosophy from `base/` remain first-class citizens at the project layer.

```
~/.pi/
├── agent/
│   └── AGENTS.md              # global layer
├── domain/
│   └── <domain-name>/
│       ├── AGENTS.md          # domain layer
│       ├── SOUL.md            # persona — required at domain creation
│       ├── memory.db          # SQLite + sqlite-vec (v1); LanceDB (v2)
│       ├── MEMORY.md          # curated, human-readable index
│       ├── watches.yaml       # proactivity declarations
│       ├── skills/            # domain-wide skills
│       └── context/           # domain-wide context files
├── active-domain              # pointer file
└── PI_DOCK.md                 # host interface

<project-root>/                # template `base/` copies into here
├── AGENTS.md                  # project layer only
├── .pi/
│   ├── settings.json
│   └── extensions/
├── context/
│   ├── project.md
│   └── client.md
└── workspaces/
    └── <workspace-name>/
        └── CONTEXT.md         # purpose, workflow, current state
# no memory/ folder at project level — memory lives in the domain DB
```

---

## 8. Migration path from v1

Six phases. Each deletes as much as it adds. Each ships independently.

| Phase | Work | Deletes |
|-------|------|---------|
| 0 | Upstream contribution: `--as-mcp` mode for pi.dev, or a thin extension that exposes the worker's domain over MCP. This unlocks the host plug-in model. | N/A — new capability. |
| 1 | Add `domain/` template directory. Update pi load order to global → domain → project. | Duplicated routing in projects. |
| 2 | Write `memory-db.ts` extension backed by sqlite-vec. Port semantic recall and observation capture. | `agentmemory-bridge.ts`, HTTP client code, Docker requirement. |
| 3 | Move per-project `memory/` contents into domain DB. Tag by project. | Per-project `SCRATCHPAD.md` and `daily/` folders. |
| 4 | Add `PI_DOCK.md` template + allowlist-enforcement extension. | Nothing yet. New surface. |
| 5 | Add `watches.yaml` + launchd/systemd install scripts + goals resolver skills. | Manual "check on this weekly" habits. |

---

## 9. Open design questions

1. **Watch outputs that need to persist.** A drafted daily plan writes where? Proposal: new observation row + optional notification. Worker reviews via `pi today`. Not a file.
2. **Concurrent domains.** Support one at a time per spec. Revisit only if a worker's engagements span two distinct domains simultaneously.

*(Questions 1 and 2 from the original draft are resolved: domain identity stored in `_meta` table; host export response shape is MCP tool calls with typed results, prose only on request.)*

---

## 10. What to build first

Order of implementation. Each phase shippable standalone.

0. Upstream `--as-mcp` mode contribution to pi.dev (unlocks the entire dock model)
1. Three-layer AGENTS.md + persona declaration at domain creation
2. Embedded memory DB (sqlite-vec extension replacing agentmemory bridge)
3. PI_DOCK.md with allowlist enforcement
4. watches.yaml + scheduler integration
5. Goals table and resolver skills

Phase 0 is the prerequisite for the portable VM model. Phases 1–2 are the architectural shift. Phase 3 unlocks host plug-in. Phases 4–5 unlock proactivity.

---

## 11. First-principles summary

| Step | Action |
|------|--------|
| Requirements less dumb | Worker-with-domain is the unit, not project. Three layers, not two. Pi.dev is a reference impl, not the only impl. |
| Delete | Per-project routing, per-project memory folder, agentmemory HTTP service, Docker dependency. |
| Simplify | One embedded DB for all memory. One dock file. One watches file per domain. |
| Accelerate | New-project bootstrap drafts context from domain DB instead of blank templates. |
| Automate | Watches fire pi on schedule. Goals trigger resolver skills on deltas. Last phase. |

---

## 12. Pi as portable artifact

The worker's pi is three things traveling together:

1. **Pi.dev binary** — installed globally (`npm i -g @mariozechner/pi-coding-agent`)
2. **Domain directory** — `~/.pi/domain/<name>/` containing AGENTS.md, SOUL.md, memory.db, watches.yaml, skills, context
3. **PI_DOCK.md** — at `~/.pi/PI_DOCK.md`

When a worker moves machines, they copy the domain directory and PI_DOCK.md. Pi.dev reinstalls in one command. The persona, memory, and behavior are all in the domain directory.

**When plugging into a host:** pi runs in MCP server mode. The host (Claude Desktop, Cursor, an employer's agent environment) connects to pi's MCP server and queries it. Pi exposes the worker's domain and memory as MCP tools and resources per the PI_DOCK.md allowlist. The host never sees raw memory — only answers.

**Why this matters:** the worker's professional context, calibration, and memory survive both tool changes and employer changes. They carry the same persona and domain knowledge between any two MCP-capable environments.

---

## 13. Embedding model

**Default: nomic-embed-text via ollama.** Lock for v1.

```bash
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull nomic-embed-text
```

**Why nomic-embed-text:**
- 768 dimensions, MIT license, retrieval-tuned (matters for memory-style queries)
- Ollama is the de facto local model runner; lowest install friction
- Used by enough open-source memory and RAG projects (continue.dev, anything-llm) that it is not an outlier pick
- Outperforms older sentence-transformers models on retrieval benchmarks

**Documented alternatives** (configured per domain in `_meta.embedding_model`):
- `mxbai-embed-large` — higher quality, larger size
- `bge-small-en-v1.5` — HuggingFace-direct if ollama is unavailable
- `text-embedding-3-small` (OpenAI) — opt-in only; worker accepts that content leaves the machine

**Invariant:** the default embedding model is always local. Workers who change this accept the privacy trade explicitly.

---

## 14. Compounding loops — v3+ work

Mechanisms that make the system get better over time, not just bigger. Named here so they are not lost.

| Loop | Mechanism | Trigger |
|------|-----------|---------|
| **Routing refinement** | Track which loaded skills were used vs ignored per session. Surface low-hit routing rows for pruning. | Monthly watch |
| **Goal adjustment** | When goals miss by the same delta over multiple checks, propose recalibration of the target. | After 3 consecutive misses |
| **Skill drift detection** | When one skill loads for many task types, flag it for splitting into narrower skills. | Weekly analysis |
| **Bootstrap quality loop** | When a new project's drafted context files get heavily edited by the worker, capture those edits as domain-level corrections. | Agent_end hook |

None of these ship in v2. All of them depend on Phase 2 (memory DB) being in place first.

---

## 15. Multi-device

**Phase 1 (sqlite-vec era):** filesystem sync.

- **Recommended default (Mac):** keep `~/.pi/domain/<name>/` in iCloud Drive. Zero-config, handles conflict resolution for a single-writer (one device active at a time) scenario.
- **Cross-platform alternative:** syncthing. Open source, peer-to-peer, no cloud intermediary.
- **Mobile read access:** worker pushes the domain directory to a private git repo. Mobile client (Working Copy, or any git client) reads MEMORY.md and AGENTS.md. Memory DB not accessible on mobile in this phase.

**Phase 2 (LanceDB era):** object-storage sync.

LanceDB has native object-storage backends. The worker points their domain at a private S3 bucket, R2 bucket, or GCS bucket. Every device reads and writes from the same store. Multi-writer becomes safe. A future "kai" mobile client can read from the same store without a sync step.

**Why this matters for the LanceDB migration:** multi-device support is the primary functional reason to migrate from sqlite-vec to LanceDB, beyond raw performance. The migration timing should track when a worker's daily workflow spans more than one machine.

---

## 16. The packaged product

Pi.dev + the five components + three-layer AGENTS.md is the product. This is what a worker (or a framework operator installing on behalf of a worker) gets.

**What the worker installs per machine:**

1. `npm install -g @mariozechner/pi-coding-agent`
2. Ollama + nomic-embed-text (see Section 13)
3. Domain template: this repo's `domain/` copied to `~/.pi/domain/<domain-name>/`
4. Global config: this repo's `global/AGENTS.md` copied to `~/.pi/agent/AGENTS.md`
5. PI_DOCK.md: this repo's template copied to `~/.pi/PI_DOCK.md`
6. Required extensions: `memory-db.ts`, allowlist-enforcement, watches runner

**One-command install target:**

```bash
./install.sh --domain <name> --persona <persona-name>
```

The install script handles all six steps and prompts for values it cannot infer.

**v2 user note:** the framework operator (the person building and configuring this) is the v2 user. The knowledge worker using the installed product is the v3 user. A natural-language authoring layer that lets a knowledge worker configure their domain without editing files is v3 work. Document the gap; do not attempt to close it in v2.

---

## 17. Persona

A persona is mandatory at domain creation. It is not optional.

**At creation:**
```bash
pi domain new gtm-strategy --persona kai
```

This creates:
- `~/.pi/domain/gtm-strategy/` directory
- `SOUL.md` at the domain layer with the persona name, tone, and voice seeded from a template
- A CLI alias on that machine: `kai` invokes `pi` with the gtm-strategy domain active

**What the persona changes:**
- SOUL.md is now a domain-layer file, not an optional project-layer file
- The persona name appears in the system prompt prefix so the agent uses it when self-referencing
- Workers run `kai today`, `kai weekly`, `kai status` — same pi.dev binary under the hood

**Why this matters:** knowledge workers do not form a working relationship with a tool named "pi." They form one with an assistant they named. The persona is what makes the framework feel like an advocate rather than a configured CLI.

**SOUL.md template at domain creation:**

```markdown
# Persona: <name>

**Name:** <name>
**Domain:** <domain-name>

## Voice
<how this assistant communicates — tone, depth, when to push back vs support>

## Identity
<what this assistant knows it is and what it is here to do>

## Relationship to the worker
<how this assistant thinks about its role>
```

The worker fills this in once at domain creation. It does not change unless the worker chooses to evolve it.
