# HEARTBEAT.md - {{DOMAIN_NAME}}

<!-- OpenClaw reads this file during heartbeat turns.

     HEARTBEAT REPLACES watches.yaml.
     Do not add cron files, launchd jobs, systemd timers, or separate watch runners.
     Recurring work lives in the native OpenClaw tasks block below and must
     resolve through the routing table in AGENTS.md.
     OpenClaw decides when the heartbeat turn runs, which tasks are due, and
     where replies are delivered. This file decides what the selected domain
     agent may check during that turn.

     Rule: if no heartbeat item needs action, reply exactly HEARTBEAT_OK.
     Keep outputs short unless a routing row explicitly asks for a delivered summary. -->

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

---

## Heartbeat Contract

OpenClaw parses the `tasks:` block above and includes only due tasks in the heartbeat prompt. Before doing any due recurring work:

1. Read the relevant row in the domain routing table in `AGENTS.md`.
2. Read `MEMORY.md` and any listed skill for that row.
3. Use `domain_status`, `domain_memory_query`, and `scratchpad_list` before guessing from stale context.
4. Write structured results with `observation_write` when a heartbeat produces useful state.
5. If nothing needs attention, reply `HEARTBEAT_OK`.

Do not infer recurring tasks from old chats. This file is the source of truth.
