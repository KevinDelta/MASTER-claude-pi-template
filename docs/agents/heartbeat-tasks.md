# Heartbeat tasks (worker-installed)

`HEARTBEAT.md` is OpenClaw-owned. The template never writes into it (see ADR 0004). To get the default recurring tasks this framework expects, paste the block below into `~/.openclaw/workspace/HEARTBEAT.md`, then edit as needed.

## Paste this block

Open `~/.openclaw/workspace/HEARTBEAT.md` and append:

```yaml
tasks:

- name: morning-plan
  interval: 24h
  prompt: "Resolve through the Session start routing row plus any project-specific planning row. If active work exists and no morning plan observation has been written today, review open scratchpad items, deferred tasks, and recent project activity. Produce a short prioritized daily plan only if there is actionable work. Also write a log observation with the plan summary. Otherwise reply HEARTBEAT_OK."

- name: weekly-sync
  interval: 7d
  prompt: "Resolve through the Domain status routing row. If no weekly sync observation has been written for the current week, summarize active projects, flag open items, and note decisions or lessons that should be promoted to MEMORY.md. Also write a structured log observation with project activity counts and pending items. Otherwise reply HEARTBEAT_OK."

- name: stale-project-check
  interval: 7d
  prompt: "Resolve through the Domain status routing row. If any project has no observations in the last 14 days and no stale-project check observation has been written for the current week, list stale projects with last activity date and ask whether to archive, resume, or close. Otherwise reply HEARTBEAT_OK."

- name: goal-review
  interval: 24h
  prompt: "Resolve through the Goal review routing row. If active goals exist and no equivalent review observation has been written for the current review window, compare observed state to each goal definition. If there is a meaningful delta, run the resolver skill and propose the next action. Always write a structured log observation when goal checks run. Otherwise reply HEARTBEAT_OK."

- name: memory-maintenance
  interval: 30m
  prompt: "Resolve through the Session end routing row. Run memory_maintenance to backfill missing embeddings and report memory health. Surface stale scratchpad items only when the worker needs to decide something. Otherwise reply HEARTBEAT_OK."
```

That gives you the five recurring checks the routing table expects. Trim or extend after the first week of use.

## How the routing contract is bound

install.sh sets this default heartbeat prompt through OpenClaw config (string binding, not file authorship):

```
Read HEARTBEAT.md if it exists. OpenClaw includes only due tasks from its
native tasks block; follow those task prompts strictly. Resolve every
recurring task through the AGENTS.md routing table before acting. If nothing
needs attention, reply HEARTBEAT_OK.
```

So every heartbeat turn first resolves through the routing table in `AGENTS.md`, then runs the task prompt. Tasks that do not point at a routing row are underspecified.

## Adding your own task

```yaml
- name: monday-client-digest
  interval: 7d
  prompt: "Resolve through the Domain status routing row. If today is Monday and no client digest observation has been written this week, summarize the past 7 days of client-facing activity by project: deliverables sent, decisions taken, and open questions. Write a structured log observation with the digest. Otherwise reply HEARTBEAT_OK."
```

Shape:

- `name` — unique kebab-case identifier
- `interval` — how often OpenClaw considers the task due (`1h`, `4h`, `24h`, `7d`)
- `prompt` — what the agent runs when due. Always:
  - Resolve through a routing row in `AGENTS.md` before acting
  - Check whether an equivalent observation already exists for the current window so duplicates don't pile up
  - Reply `HEARTBEAT_OK` when nothing needs attention

## Rules

- Heartbeat is the only recurring-work surface. Do not add cron files, launchd jobs, systemd timers, or separate watch runners.
- The agent does not infer recurring tasks from old chat history. This file is the source of truth.
- Keep outputs short unless a routing row explicitly asks for a delivered summary.
