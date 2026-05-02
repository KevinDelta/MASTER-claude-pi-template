# Key Design Decisions

| Decision | What | Why |
|----------|------|-----|
| OpenClaw is the default runtime | Gateway, agents, channels, identity, heartbeat, plugins | Deletes custom runtime/process code and matches the portable-agent goal |
| Routing table remains primary | Every CLI, channel, heartbeat, and project task resolves through `AGENTS.md` | Prevents workspace memory from becoming vague implicit context |
| Heartbeat replaces watches | `HEARTBEAT.md` owns recurring work; no `watches.yaml` or OS scheduler templates | Removes cron/scheduler layer and keeps proactivity in OpenClaw |
| Dock is harness-neutral | `DOCK.md`, not `PI_DOCK.md` | Export policy should survive runtime changes |
| SQLite memory stays | `memory.db` plus domain-memory plugin | Preserves cross-project recall and status while OpenClaw handles runtime |
| Memory use is explicit | `domain_memory_query`, `scratchpad_list`, `observation_write`, `memory_maintenance` | Avoids depending on Pi lifecycle hooks that OpenClaw may not mirror |
| Raw observations denied | `raw_observations` tool always refuses by default | Keeps local memory/export boundary clear |
| Skills keep YAML frontmatter | `name` + `description` fields | Makes skill routing and discovery stable across runtimes |
| CONTEXT.md has Functions + Workflow | Stable process sections added | Gives the agent action vocabulary and sequencing without duplicating routing tables |
| No routing tables in CONTEXT.md | Routing remains in `AGENTS.md` | Routing is architecture; CONTEXT.md is volatile state |
