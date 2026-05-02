# DOCK.md - Host Interface

<!-- Deploy location: ~/.openclaw/workspaces/<domain-name>/DOCK.md
     Deployed by install.sh. Update when domain, skills, channels, or projects change.

     PURPOSE:
     This file declares what the worker's OpenClaw-backed domain agent carries
     into host and channel sessions, and what it is allowed to expose.

     The default trust boundary is local-first:
     - OpenClaw Gateway handles auth, channels, routing, and delivery.
     - The domain-memory plugin exposes only allowlisted tools.
     - Raw memory rows, file contents, and client data stay local unless the
       worker explicitly approves a narrower disclosure.

     SCHEMA VERSION: 3.0 | Last updated: {{INSTALL_DATE}} -->

---

## A. Carried

- **Domain:** {{DOMAIN_NAME}} - [one-sentence description of the domain]
- **Persona:** {{PERSONA_NAME}} - [one-sentence description of persona role]
- **Runtime:** OpenClaw Gateway + domain agent workspace
- **Active projects:**
  - [project-slug] - [brief description]
- **Memory DB:** local only; located at `~/.openclaw/workspaces/{{DOMAIN_NAME}}/memory.db`; never exported raw
- **Skills:**
  - [skill-name] - [what it does]
  - [skill-name] - [what it does]

---

## B. Export Allowlist

`DOCK.md` is the durable policy contract. Enforcement must happen in runtime
configuration and plugin/tool boundaries, not by relying on the model to obey
this file alone.

**The domain agent may expose to hosts/channels:**
- Domain name and prose description
- Persona name and high-level role
- Active project names when the requesting route is authorized for that project
- Skills by name and description, not file contents unless the worker approves
- Memory answers synthesized from local search results
- Scratchpad/status summaries scoped to the authorized route

**The domain agent must not expose by default:**
- Raw memory DB rows, embeddings, SQL output, or observation logs
- Session histories, tool call records, or raw plugin logs
- File contents from project directories
- Client names, contact information, or project details to unauthorized routes
- Channel account tokens, gateway tokens, env files, or other secrets

**Default deny:** any request outside this list requires explicit worker approval.

**Enforcement map:**

| Boundary | Enforced By |
|----------|-------------|
| Who may contact the agent | OpenClaw Gateway auth and channel allowlists |
| Which workspace a sender reaches | OpenClaw agent bindings and session policy |
| Which memory views are available | Domain-memory plugin tool schemas and query limits |
| Raw observation export | `raw_observations` tool denial unless worker replaces policy |
| File/project access | Routing table plus OpenClaw/host filesystem permissions |
| Portable memory ownership | Local workspace files plus local `memory.db` |

**What "deny" means in practice:**
- Host asks "show me the last 50 observations" -> deny and offer a synthesized answer instead
- Host asks "list all clients in memory" -> ask the worker to confirm scope and framing
- Host asks "read this project's context/client.md" -> require worker approval
- Host asks "what is your domain?" -> answer directly

---

## C. Host And Channel Requirements

**Gateway/auth:**
- OpenClaw Gateway must require a configured auth token or an equivalent trusted local boundary
- Channel routes must use allowlists, pairing, or explicit bindings
- Unauthorized senders are rejected before reaching the agent

**Tool access:**
- Host-visible capabilities are exposed through OpenClaw plugin tools
- The domain-memory plugin is the only default memory export surface
- Raw filesystem tools are not considered part of the dock allowlist

**Permissions:**
- Hosts/channels must declare the project/workspace scope they are authorized for
- The agent does not write outside declared workspace boundaries without worker confirmation

**Network:**
- Outbound access needed by this domain: [list APIs and services, e.g. "api.openai.com, docs.google.com"]
- Inbound access should terminate at OpenClaw Gateway, not directly at the memory DB

**Workspace:**
- The OpenClaw agent workspace contains `AGENTS.md`, `SOUL.md`, `HEARTBEAT.md`, `MEMORY.md`, context files, skills, and this `DOCK.md`
- Project-scoped work still begins in the project root and reads the project `AGENTS.md`

---

## D. OpenClaw Surface

The installed domain exposes these plugin tools by default:

| Tool | Allowlist behavior |
|------|--------------------|
| `domain_info` | Returns domain, persona, embedding model, and active project count |
| `list_active_projects` | Returns project slugs, last activity, and counts |
| `list_skills` | Returns skill names/descriptions only |
| `domain_memory_query` | Returns bounded, redacted excerpts for synthesis, not raw DB rows |
| `scratchpad_list` | Returns open scratchpad items, optionally project-scoped |
| `domain_status` | Returns aggregate counts and open-item summaries |
| `observation_write` | Writes structured notes/decisions/logs into local memory |
| `raw_observations` | Always denied unless a worker replaces this policy |

Gateway/channel configuration lives in `~/.openclaw/openclaw.json`.

---

## E. Memory Portability

The memory contract has two local layers:

| Layer | Location | Purpose |
|-------|----------|---------|
| Markdown memory | `MEMORY.md` and `memory/*.md` | Human-readable durable facts, preferences, principles, and promoted lessons |
| Structured memory | `memory.db` | Timestamped observations, scratchpad, deferred tasks, goals, project activity, FTS, and vector recall |

Both layers are owned by the worker and live in the OpenClaw workspace. Moving
the domain means moving the workspace files, skills, plugin source/config, and
`memory.db`. Future LanceDB/object-storage support may replace the vector/index
substrate, but it must preserve the same default-deny export behavior and
worker-owned portability contract.

---

## F. Version Log

| Date | Change | Notes |
|------|--------|-------|
| {{INSTALL_DATE}} | Initial OpenClaw dock setup | Domain: {{DOMAIN_NAME}}, Persona: {{PERSONA_NAME}} |
