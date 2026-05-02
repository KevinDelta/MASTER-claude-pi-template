# Backlog - MASTER OpenClaw Agent Template

This backlog reflects the OpenClaw refactor. Legacy Pi/FastMCP/watch items live in git history and old changelog entries, not in the active backlog.

---

## P0 - Refactor Hardening

- [ ] **Plugin config readback**
  - Confirm how OpenClaw passes `plugins.entries["domain-memory"].config` into plugin runtime and wire config values directly instead of relying primarily on env vars.

- [ ] **Schema version table and migration scaffold**
  - Add `_schema_version` and ordered migrations to the domain-memory plugin before the next schema change.

- [ ] **Domain-memory smoke test**
  - Add a local script that initializes a temp DB, inserts observations, verifies FTS triggers, runs `domain_status`, and denies `raw_observations`.

- [ ] **Installer real-run validation**
  - On a disposable domain, run `./install.sh --domain smoke --persona Nova --skip-ollama`, then verify `openclaw agents list --bindings`, plugin link, and heartbeat config.

---

## P1 - Memory Quality

- [ ] **Embedding backfill cursor**
  - Process oldest unembedded observations first and report remaining backlog from `memory_maintenance`.

- [ ] **Retry/error accounting for embeddings**
  - Track failed embedding attempts and stop retrying permanently bad rows.

- [ ] **Hybrid ranking**
  - Score results across vector distance, FTS rank, recency, project match, and observation kind.

- [ ] **Token-aware recall output**
  - Bound `domain_memory_query` result size with token-aware chunking rather than raw result count.

---

## P2 - Dock And Channel Trust

- [ ] **Per-channel/project scope**
  - Map OpenClaw channel bindings to authorized project scopes before exposing project status.

- [ ] **Raw tool-call summarization**
  - Store summarized tool-call observations rather than raw argument dumps when tool capture is added.

- [ ] **Gateway auth runbook**
  - Document token generation, rotation, channel allowlists, and trusted local-only mode.

---

## P3 - Worker UX

- [ ] **Natural-language domain authoring**
  - Generate domain `AGENTS.md`, `SOUL.md`, `HEARTBEAT.md`, context files, and initial routing rows from a worker interview.

- [ ] **Package distribution**
  - Package domain templates, skills, plugin config, and routing rows for teams.

- [ ] **Routing refinement loop**
  - Heartbeat reviews low-hit routing rows and proposes pruning/splitting.

- [ ] **Bootstrap quality loop**
  - When a new project's context files are heavily edited after bootstrap, capture the edits as domain-level corrections.

---

## Housekeeping

- [ ] Add worked examples for context files.
- [ ] Add domain-specific skill packs for research, writing, code, and ops.
- [ ] Update legacy docs or move them under an explicit archive folder.
