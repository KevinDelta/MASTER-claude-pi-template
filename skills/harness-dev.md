---
name: harness-dev
description: Dev flow for building and iterating on the OpenClaw agent harness. Load when working on AGENTS.md, HEARTBEAT.md, DOCK.md, skills, plugins, OpenClaw config, or installer behavior.
---

# harness-dev

## Purpose

Guide changes to the agent harness itself: routing tables, workspace templates, skills, OpenClaw config, heartbeat, dock policy, and plugins. This skill is meta; use it when changing the harness, not when doing normal project work inside it.

## Non-Negotiable Direction

The routing table is the cognition contract. Strengthen it whenever the framework gains a new capability.

There are two routing layers. Keep them separate:

| Layer | Owner | Decides |
|-------|-------|---------|
| Native routing | OpenClaw config/bindings | Which agent, workspace, session, channel, account, or peer receives the message |
| Work routing | `AGENTS.md` routing table | What the selected agent reads, which workspace it uses, and which skills/tools apply |

Every new work entrypoint must have an `AGENTS.md` routing answer:
- direct CLI task after the agent is selected
- channel-originated task after OpenClaw has selected the agent
- heartbeat task after OpenClaw has started the heartbeat turn
- project workflow
- memory maintenance task
- dock/export request

If a capability cannot point to a routing row, the capability is not ready.

If a requirement is about channel/account/peer matching, session scope, delivery target, or agent selection, do not put it in `AGENTS.md`. Put it in OpenClaw config.

---

## Adding Or Modifying A Skill

Skills remain Markdown files with YAML frontmatter:

```markdown
---
name: skill-name-with-hyphens
description: One sentence. What it does and when to load it.
---
```

Rules:
- Use lowercase alphanumeric names with hyphens.
- Keep descriptions specific enough for routing.
- Add or update a routing-table row that names the skill.
- Configure the skill directory through OpenClaw `skills.load.extraDirs`.

Verification:
- Confirm the installed workspace has the skill under `~/.openclaw/workspaces/<domain>/skills/`.
- Run an OpenClaw turn that matches the routing row and verify the agent uses the skill before acting.

---

## Modifying Routing Tables

When adding a new route, define:
- task key and trigger language,
- workspace,
- files to read,
- skills/tools to use,
- what memory query/write behavior is expected,
- whether the route can be invoked after a heartbeat or channel binding selects this agent.

Acceptance check:
- Direct CLI work routes correctly.
- Channel-originated work routes correctly after OpenClaw selects the agent.
- Heartbeat work routes correctly if recurring.
- Project-specific overrides do not duplicate global/domain rules.
- No channel/account/peer binding is encoded in `AGENTS.md`.

Do not add broad catch-all rows to hide missing design. Missing rows are useful pressure.

---

## Updating OpenClaw Config

Active machine config lives at:

```
~/.openclaw/openclaw.json
```

Template/reference config lives at:

```
domain/openclaw/openclaw.domain.json5
```

Common changes:
- model: `agents.defaults.model.primary`
- thinking: `agents.defaults.thinkingDefault`
- heartbeat cadence: `agents.defaults.heartbeat.every`
- heartbeat prompt: `agents.defaults.heartbeat.prompt`
- skills: `skills.load.extraDirs`
- plugins: `plugins.load.paths` and `plugins.entries`
- channels: channel allowlists and route bindings

Use `openclaw config set ...` when possible. For complex JSON5 edits, update the template and document the manual merge.

Do not mirror channel bindings in `AGENTS.md`. At most, add a task row for the kind of work that arrives after the binding selects this agent.

---

## Heartbeat Changes

Recurring work belongs in the native `tasks:` block in `HEARTBEAT.md`, not `watches.yaml` or OS scheduler files.

Before adding heartbeat behavior:
- Add or update the corresponding routing row.
- Add or update a named `tasks:` entry with an interval and a concise prompt.
- Put idempotence checks in the task prompt when exact cron behavior is not required.
- Decide whether the result is worker-facing, memory-only, or both.
- Use `observation_write` for structured recurring outputs.

Heartbeat work should be conservative. If there is no meaningful delta, return `HEARTBEAT_OK`.

---

## Plugin Changes

OpenClaw plugins live under:

```
domain/openclaw/plugins/
```

The current local plugin is `domain-memory`, which owns SQLite/sqlite-vec memory tools.

When adding plugin tools:
- Register tools through `definePluginEntry`.
- Keep tool names stable and descriptive.
- Enforce `DOCK.md` export policy in the tool itself; policy text is not enforcement.
- Return summaries, aggregates, or bounded/redacted excerpts unless the worker explicitly adds an admin/raw export path.
- Add tool usage expectations to the routing table or relevant skill.
- Add heartbeat behavior only through `HEARTBEAT.md`.

Do not rely on Pi lifecycle hooks. If OpenClaw lifecycle hooks are introduced later, add them as an optimization after explicit tool behavior works.

---

## Debugging Unexpected Agent Behavior

1. Check routing: ask which routing row was selected and which files were read.
2. Check workspace: verify the turn targeted the intended OpenClaw agent/workspace.
3. Check skills: verify `skills.load.extraDirs` includes the installed skills directory.
4. Check heartbeat: read `HEARTBEAT.md`; old chat history is not a source of recurring tasks.
5. Check memory: use `domain_memory_query`, `domain_status`, and `scratchpad_list`.
6. Check dock policy: if an export is denied, confirm whether `DOCK.md` allows it.

---

## Harness Development Checklist

- [ ] Every new capability resolves through a routing row.
- [ ] Heartbeat behavior is represented as a native `tasks:` entry in `HEARTBEAT.md`.
- [ ] Skills have valid frontmatter and are named by routing rows.
- [ ] Plugin tools enforce `DOCK.md` allowlist behavior.
- [ ] Project `TOOLS.md` matches project out-of-bounds rules.
- [ ] OpenClaw config templates use env refs for secrets.
- [ ] `install.sh --dry-run` completes.
- [ ] No `watches.yaml`, scheduler templates, `.pi/settings.json`, or Pi MCP server paths are reintroduced.
