# MASTER-claude-pi-template

> This file is read by Claude Code as project instructions. OpenClaw agents read `AGENTS.md`, `SOUL.md`, `HEARTBEAT.md`, `DOCK.md`, and the context/skill files routed by `AGENTS.md`.

A template system for building portable, domain-scoped knowledge worker agents. The core idea remains: a well-structured set of files is the agent's working brain. The runtime is now **OpenClaw v2026.4.9+**, with OpenClaw Gateway handling agents, channels, identity, heartbeat, auth, and routing to isolated workspaces.

**Default runtime/control plane:** OpenClaw. Pi.dev is now legacy history, not the active harness.

**Durable spec:** routing-table-first orientation, domain persona, local memory, portable context, skills, heartbeat, and dock/export policy.

---

## How to Use This Template

**Prerequisite:** OpenClaw must be initialized first (`openclaw onboard`). The workspace at `~/.openclaw/workspace/` must exist.

1. Run `./install.sh --domain <name> --persona <persona-name>`
   - Replaces `~/.openclaw/workspace/AGENTS.md` with combined global + domain routing
   - Appends domain identity to `~/.openclaw/workspace/SOUL.md` (preserves OC's content)
   - Appends domain tasks to `~/.openclaw/workspace/HEARTBEAT.md` (preserves OC's content)
   - Adds MEMORY.md, DOCK.md, context/, skills/ (skip-if-exists — no overwrites)
2. Fill in `~/.openclaw/workspace/SOUL.md` — the `# Domain Identity:` section the installer added
3. Fill in `~/.openclaw/workspace/AGENTS.md` - routing rows, delete annotation blocks
4. Fill in `~/.openclaw/workspace/context/domain.md` - what the domain is, active projects
5. Fill in `~/.openclaw/workspace/DOCK.md` - carried items, export allowlist, host/channel requirements
6. Optionally create a project: `--project-slug <name>` → `~/.openclaw/workspace/projects/<slug>/`
7. Fill in project `AGENTS.md`, `TOOLS.md`, `context/` files, and `areas/`
8. Delete annotation comments before going live

Projects live inside OC's native workspace — the single git-tracked home for domain brain files and all project work.

Wizard-based onboarding uses `master.json` as the canonical intake contract:

```bash
./install.sh --intake-json master.json --project-slug <name>
```

The HTML wizard collects intake and creates a thin setup wrapper. `install.sh`
remains the single authority for OpenClaw workspace provisioning, global+domain
`AGENTS.md` composition, plugin setup, heartbeat defaults, and project creation.

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
│       └── plugins/
│           ├── domain-memory/
│           └── domain-commerce/   # optional Stripe workflow plugin
├── base/
│   ├── AGENTS.md
│   ├── TOOLS.md
│   ├── SOUL.md
│   ├── openclaw/
│   ├── context/
│   └── areas/
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
| `domain/openclaw/plugins/domain-commerce/` | Optional Stripe workflow plugin with approval gates |
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
