# MASTER-claude-pi-template

> This file is read by Claude Code as project instructions. OpenClaw agents read `AGENTS.md`, `SOUL.md`, `HEARTBEAT.md`, `DOCK.md`, and the context/skill files routed by `AGENTS.md`.

A template system for building portable, domain-scoped knowledge worker agents. The core idea remains: a well-structured set of files is the agent's working brain. The runtime is now **OpenClaw v2026.4.9+**, with OpenClaw Gateway handling agents, channels, identity, heartbeat, auth, and routing to isolated workspaces.

**Default runtime/control plane:** OpenClaw. Pi.dev is now legacy history, not the active harness.

**Durable spec:** routing-table-first orientation, domain persona, local memory, portable context, skills, heartbeat, and dock/export policy.

---

## How to Use This Template

1. Run `./install.sh --domain <name> --persona <persona-name>`
2. Fill in `~/.openclaw/workspaces/<name>/AGENTS.md` - domain vocabulary, methods, routing scaffold
3. Fill in `~/.openclaw/workspaces/<name>/SOUL.md` - persona voice, identity, relationship to worker
4. Fill in `~/.openclaw/workspaces/<name>/context/domain.md` - what the domain is, active projects
5. Fill in `~/.openclaw/workspaces/<name>/HEARTBEAT.md` - recurring work handled by OpenClaw heartbeat
6. Fill in `~/.openclaw/workspaces/<name>/DOCK.md` - carried items, export allowlist, host/channel requirements
7. Copy `base/` into each new project root; set `PROJECT_ID` in the project env source
8. Fill in project `AGENTS.md`, `TOOLS.md`, `context/` files, and `workspaces/`
9. Delete annotation comments before going live

The quality of agent output is a direct function of routing-table coverage. Every direct turn, channel route, heartbeat, and project workflow should resolve through an `AGENTS.md` routing row before work begins.

---

## Repo Structure

```
MASTER-claude-pi-template/
├── CLAUDE.md
├── xDOCS/BLUEPRINT.md
├── install.sh
├── DOCK.md
├── global/
│   └── AGENTS.md
├── domain/
│   ├── AGENTS.md
│   ├── SOUL.md
│   ├── MEMORY.md
│   ├── HEARTBEAT.md
│   ├── context/
│   ├── skills/
│   └── openclaw/
│       ├── openclaw.domain.json5
│       ├── .env.example
│       └── plugins/domain-memory/
├── base/
│   ├── AGENTS.md
│   ├── TOOLS.md
│   ├── SOUL.md
│   ├── openclaw/
│   ├── context/
│   └── workspaces/
└── skills/
```

---

## Working on This Repo

**Key files when making structural changes:**

| File | What it controls |
|------|------------------|
| `install.sh` | OpenClaw domain workspace, agent, plugin, heartbeat, and persona setup |
| `global/AGENTS.md` | Org-wide instructions included in every installed domain workspace |
| `domain/AGENTS.md` | Domain-layer routing and operating contract |
| `domain/HEARTBEAT.md` | Recurring/proactive work; replaces `watches.yaml` |
| `domain/openclaw/plugins/domain-memory/` | SQLite/sqlite-vec memory plugin for OpenClaw |
| `base/AGENTS.md` | Project-layer routing template |
| `base/TOOLS.md` | Project tool policy declaration |
| `DOCK.md` | Host/channel export contract |
| `skills/*.md` | Universal skills loaded by routing rows |

**Do not reintroduce:**

- `watches.yaml`
- launchd/systemd scheduler templates for agent work
- `.pi/settings.json`
- Pi lifecycle extensions as the active runtime path
- standalone Pi MCP server docs as the active dock path

OpenClaw heartbeat owns recurring work. OpenClaw Gateway/plugin/channel configuration owns the host surface.
