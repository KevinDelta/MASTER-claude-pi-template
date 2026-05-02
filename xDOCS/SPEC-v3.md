# SPEC v3 - OpenClaw Runtime Refactor

**Status:** Implemented in template. OpenClaw is now the default runtime/control plane. Pi.dev, `.pi` settings, `watches.yaml`, OS scheduler templates, and the standalone Pi MCP server are legacy history.

---

## 1. What v3 changes

V2 proved the durable framework shape:

- layered `AGENTS.md`
- domain persona
- local memory DB
- dock/export policy
- proactive recurring work
- project routing and skills

V3 changes the runtime implementation. OpenClaw now handles the pieces that should be native control-plane behavior:

- Gateway/auth
- agent workspaces
- identity/persona binding
- channel access
- multi-agent routing
- heartbeat
- plugin loading
- local and remote agent turns

The framework keeps the spec pieces that make the agent useful:

- routing-table-first work
- domain/project context
- `SOUL.md`
- `MEMORY.md`
- `HEARTBEAT.md`
- `DOCK.md`
- SQLite/sqlite-vec domain memory
- skills

---

## 2. Routing is stronger, not weaker

OpenClaw's workspace memory does not replace routing tables. OpenClaw native routing and framework task routing are separate layers:

| Layer | Owner | Decides |
|-------|-------|---------|
| Native routing | OpenClaw agents/bindings/channels/sessions/heartbeat target | Which agent/workspace/session receives the message |
| Task routing | `AGENTS.md` routing tables | What the selected agent reads, where it works, and which skills/tools apply |

The routing table is the decision surface for work after OpenClaw has selected the agent.

Every entrypoint resolves through `AGENTS.md`:

- direct CLI turn
- channel-routed turn
- heartbeat turn
- project workflow
- memory maintenance
- dock/export request

If there is no matching routing row, the agent asks or escalates instead of guessing.

Channel/account/peer bindings must not be duplicated in `AGENTS.md`; those stay in OpenClaw config.

---

## 3. Deleted runtime surfaces

Deleted from the active template:

- `PI_DOCK.md`
- `domain/watches.yaml`
- `scheduler/`
- `domain/.pi/settings.json`
- `base/.pi/settings.json`
- Pi lifecycle extension template
- standalone FastMCP server
- Pi persona alias
- Pi-specific env vars (`PI_DOMAIN_NAME`, `PI_PROJECT_ID`, etc.)

Replacement surfaces:

| Deleted | Replacement |
|---------|-------------|
| `PI_DOCK.md` | `DOCK.md` |
| `watches.yaml` | `HEARTBEAT.md` |
| launchd/systemd scheduler | OpenClaw heartbeat |
| `.pi/settings.json` | OpenClaw config + `domain/openclaw/openclaw.domain.json5` |
| Pi memory extension | OpenClaw `domain-memory` plugin |
| FastMCP dock server | OpenClaw plugin tools + Gateway/channel auth |

---

## 4. OpenClaw install target

The installer creates:

```
~/.openclaw/
├── active-domain
├── plugins/domain-memory-<domain>/
└── workspaces/<domain>/
    ├── AGENTS.md
    ├── SOUL.md
    ├── HEARTBEAT.md
    ├── MEMORY.md
    ├── DOCK.md
    ├── openclaw.domain.json5
    ├── context/
    └── skills/
```

It also runs the relevant OpenClaw CLI setup:

- install/check `openclaw`
- link the local plugin with `openclaw plugins install -l`
- create the agent with `openclaw agents add`
- set identity
- configure heartbeat defaults
- optionally onboard the Gateway daemon
- optionally pull `nomic-embed-text`

---

## 5. Heartbeat replaces watches

`HEARTBEAT.md` is the only recurring-work contract. It uses OpenClaw's native `tasks:` block so OpenClaw owns due-task selection and the framework owns what each due task may do.

Former watch behavior maps to heartbeat tasks:

| Former watch | New heartbeat task |
|--------------|-----------------------|
| morning plan | `morning-plan` |
| weekly sync | `weekly-sync` |
| stale project check | `stale-project-check` |
| goal checks | `goal-review` |
| JSON watch output | `observation_write(kind: "log", meta: {...})` |

Heartbeat prompt:

```
Read HEARTBEAT.md if it exists. OpenClaw includes only due tasks from its native tasks block; follow those task prompts strictly. Resolve every recurring task through the AGENTS.md routing table before acting. If nothing needs attention, reply HEARTBEAT_OK.
```

Tradeoff: heartbeat is interval/condition-based, not cron-precise. OpenClaw includes only due tasks; task prompts define idempotence conditions that prevent duplicate daily/weekly outputs. This removes an OS-specific scheduler layer and keeps recurring work inside the same OpenClaw workspace, route, plugin, and dock policy.

---

## 6. Memory plugin

The `domain-memory` OpenClaw plugin preserves the existing SQLite/sqlite-vec memory substrate alongside OpenClaw's Markdown memory.

Memory split:

| Layer | Location | Use |
|-------|----------|-----|
| OpenClaw Markdown memory | `MEMORY.md` and `memory/*.md` | Durable facts, preferences, principles, promoted lessons |
| Framework structured memory | `memory.db` | Observations, scratchpad, deferred tasks, goals, project activity, FTS, vector recall, export-scoped status |

Tools:

- `domain_info`
- `list_active_projects`
- `list_skills`
- `domain_memory_query` (bounded, redacted excerpts)
- `scratchpad_list`
- `domain_status`
- `observation_write`
- `memory_maintenance`
- `raw_observations` (denied)

Automatic Pi-style lifecycle capture is not required. Memory use is explicit through routing rows and skills. If OpenClaw adds or exposes matching lifecycle hooks, the plugin can add automatic recall/capture later as an optimization.

---

## 7. Dock policy

`DOCK.md` defines what the domain agent may expose to hosts/channels. It is the durable policy contract; enforcement lives in OpenClaw config, channel allowlists, agent bindings, plugin schemas, and host filesystem permissions.

Default allowlist:

- domain metadata
- persona role
- active project names when authorized
- skill names/descriptions
- synthesized memory answers
- scratchpad/status summaries

Default deny:

- raw DB rows
- embeddings
- observation logs
- session histories
- tool call records
- secret-bearing files
- unauthorized client/project details

OpenClaw Gateway and channel allowlists handle transport/auth. OpenClaw agent bindings select the workspace. Plugin tools enforce memory/export boundaries. Portability means the worker owns the workspace files, skills, plugin source/config, Markdown memory, and `memory.db`; future LanceDB support must preserve the same default-deny export policy.

---

## 8. Acceptance criteria

- `install.sh --dry-run` completes.
- Fresh install creates an OpenClaw domain workspace.
- `openclaw agents list --bindings` shows the domain agent after real install.
- The installed workspace has combined global+domain `AGENTS.md`.
- Heartbeat uses `HEARTBEAT.md`; no `watches.yaml` or scheduler files exist.
- Existing skills load through OpenClaw skill dirs.
- `domain-memory` plugin tools initialize/query `memory.db`.
- `raw_observations` is denied.
- Project template uses `PROJECT_ID`, not Pi env vars.
- Harness docs tell future agents not to reintroduce Pi runtime paths.
