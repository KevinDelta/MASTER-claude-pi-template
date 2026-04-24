# Unified Backlog — MASTER-claude-pi-template

This backlog consolidates all open tasks, hardening efforts, and the V3 remaining tranche.

## 1. Foundation Hardening (Central Bet)
*Extracted from the former FOUNDATION-BACKLOG.md. The central bet is only true if the system is Correct, Safe, Portable, and Operable.*

### P0 — Trust Boundary Hardening (0–3 weeks)
- [x] **P0-A1: Enforce required token in HTTP mode** *(done 2026-04-24)*
  - `mcp-server.ts` now exits non-zero with a diagnostic message if `PI_MCP_TRANSPORT=http` and `PI_WORKER_TOKEN` is unset. Added before server construction so the check runs before any listener binds.
  - **Note:** Also caught a latent bug — if `PI_WORKER_TOKEN` were unset, `undefined !== undefined` would pass unauthenticated requests silently. Fail-closed startup closes that path entirely.

- [ ] **P0-A2: Add token-strength validation + generation path**
  - Generate secure token during `install.sh` if absent; validate minimum entropy/length.
  - **Note:** Straightforward. Add `openssl rand -hex 32` to `install.sh` step 5 (`.env` creation), writing `PI_WORKER_TOKEN=<generated>` if the key is absent. Length check (≥32 hex chars) can be a warn-not-fail since workers may use passphrases. Print rotation instructions in the install summary. Pair with P0-A1 — low effort, high trust payoff.

- [ ] **P0-B1: Replace raw observation payloads in host responses**
  - `query_memory` returns sanitized snippets + metadata, never full raw tool logs.
  - **Note — needs a design decision before building.** The current `query_memory` behavior (returning raw content chunks for the host LLM to synthesize) is intentional and load-bearing. Stripping to metadata-only risks breaking the recall utility that makes the tool valuable. Suggested resolution: add `source_kind`, `project`, `timestamp` as structured metadata *alongside* content, and separately enforce that `tool_call` observations are summarized (not raw args dumps) before insert. That separates the policy concern (what's stored) from the host concern (what's returned). Do not build P0-B1 until this is resolved.

- [x] **P0-B2: Redact secrets before memory write** *(done 2026-04-24)*
  - `redactSecrets()` function added to `memory-db.ts` covering: known API key prefixes (sk-, ghp_, AKIA, etc.), bearer tokens, private key blocks, connection strings with credentials, and `.env`-style key=value assignments. Runs before truncation in both `tool_call` and `tool_call_error` handlers.
  - **Note:** Patterns are conservative by design — avoids false positives on SHA hashes or path segments. Workers writing custom note observations manually should be aware redaction only runs on auto-captured tool calls today. Extend to manual ingestion paths when those are added.

- [x] **P0-C1: Add FTS sync triggers** *(done 2026-04-24)*
  - Three triggers added to `initDB`: `observations_fts_ai` (after insert), `observations_fts_ad` (after delete), `observations_fts_au` (after update). FTS5 external-content tables are silent about stale indexes — this was a correctness bug affecting every deployed domain. All idempotent via `CREATE TRIGGER IF NOT EXISTS`.

- [ ] **P0-C2: Schema version table and migration scaffold**
  - Add `_schema_version` table and migration runner pattern to `memory-db.ts`.
  - **Note:** Clear shape — add a `_schema_version(version INTEGER, applied_at TIMESTAMP)` table; `initDB` checks current version against `CURRENT_SCHEMA_VERSION` const and runs any pending migration functions in sequence. No data loss risk for additive migrations (new tables, new columns with defaults). Destructive changes need explicit export/re-import. Build this before any future schema change ships — P0-C1 triggers are the last safe change without versioning.

### P1 — Memory Lifecycle + Retrieval Reliability (3–8 weeks)
- [ ] **P1-A1: Backfill cursor to prevent starvation**
  - Track last embedded observation ID and process oldest-unembedded first.
  - **Note:** Current code uses `ORDER BY o.id DESC LIMIT 50` — processes newest first, so old observations never get vectors in active domains. One-line fix: change to `ORDER BY o.id ASC`. Log a "backfill progress: N remaining" line at `agent_end` for visibility. Do this early — it degrades silently.

- [ ] **P1-A2: Retry/error accounting for embedding failures**
  - Persist per-row failure counts and last error for embedding calls.
  - **Note:** Needs a schema change (new columns on `observations` or a separate `_embedding_errors` table). Sequence: P0-C2 (schema versioning) first, then this as migration v2. Keep the retry budget tight (e.g., 3 attempts) — permanently failed rows should be flagged, not retried forever.

- [ ] **P1-B1: Hybrid ranking model**
  - Replace simple merge-dedupe with scoring across semantic similarity, recency, project match, and observation kind.
  - **Note:** Current merge is just deduplicate-and-prefer-vector. A real scoring function needs: cosine distance (from vec search), BM25 rank (from FTS), recency decay, project match bonus, and kind weighting (decisions > tool_calls > logs). The blocker is evaluation — you need a labeled query set to know if a new ranker is better. Build the eval set first (10–20 representative queries + expected results), then tune. Don't ship a ranker without measuring it.

- [ ] **P1-B2: Token-aware context injection**
  - Replace char-budget heuristic with token estimation or bounded chunking strategy.
  - **Note:** With the recent move to `message`-based injection (instead of `systemPrompt`), the injection is now in the conversation turn — token counting there matters differently than it did in the system prompt. The `TOKEN_BUDGET * 4` char heuristic is workable for now but breaks on CJK text and code. A lightweight fix: use a 3-char/token estimate for code-heavy domains, 4 for prose. A real fix requires a tokenizer (tiktoken or equivalent). Defer until there's a concrete overrun case.

- [ ] **P1-C1: Host query scoping policy**
  - Add optional project allowlist/denylist per host session.
  - **Note:** Depends on knowing which worker/host is querying — requires some session identity beyond the shared `PI_WORKER_TOKEN`. Either multi-token support (one token per host, each with a scope) or a scoping claim in the token itself (e.g., a signed JWT with allowed projects). Design the identity model first. Not worth building without it.

- [ ] **P1-C2: Data retention + archival policies**
  - Implement retention tiers by observation kind and age.
  - **Note:** Simplest shape: a `retention_days` config per `kind` (e.g., `tool_call: 90`, `decision: 730`, `compact_summary: 365`). A watch runs the DELETE + vacuum periodically. Archived rows need an export-before-delete path (P2-A1 dependency). Design the archive format before implementing so deletion is reversible.

### P2 — Operability, Portability, and Sync Hardening (8–12 weeks)
- [ ] **P2-A1: Signed export/import workflow**
  - Add CLI flow for export/import with checksum verification and schema compatibility checks.
  - **Note:** Export = `SELECT * FROM observations` → JSON with schema version header + SHA-256 checksum. Import = validate checksum, check schema version compatibility, insert with conflict handling. A shell script (`scripts/export.sh`, `scripts/import.sh`) is sufficient — no need for a full CLI binary. This also unblocks P1-C2 (archival) since you need a safe export path before you can delete anything.

- [ ] **P2-A2: Recovery drill docs + scripted checks**
  - Add standard recovery runbook to `BLUEPRINT.md` and `memory-db.md`.
  - **Note:** The runbook should be executable, not just prose — a `scripts/health-check.sh` that verifies: DB file exists, schema version matches, FTS is in sync (spot-check 10 rows), vector index has no orphaned rows, row counts are non-zero. Run it after any restore. Pair with P2-A1.

- [ ] **P2-B1: Single-writer lock protocol**
  - Define explicit lock/lease mechanism for filesystem sync era.
  - **Note:** SQLite's WAL mode already provides some protection, but iCloud/Syncthing don't understand WAL files — they sync `.db`, `.db-wal`, and `.db-shm` independently, which can interleave. The protocol needed here is at the file-system level: a `.pi-lock` file written before session start, removed at session end, with a stale-lock timeout. Document the "what to do if lock is stuck" procedure clearly. This is primarily a docs + convention problem, not a code problem — but a helper script for lock acquisition makes it ergonomic.

- [ ] **P2-B2: Sync conflict detector**
  - Add periodic check for divergent sequence signatures between devices/backups.
  - **Note:** A signature can be as simple as `MAX(id) || COUNT(*)` from `observations`. If two backups have the same MAX(id) but different COUNT(*), something was deleted on one device. Run this as a watch and surface discrepancies in MEMORY.md. Low engineering cost, high diagnostic value.

- [ ] **P2-C1: Runtime health metrics**
  - Emit structured health metrics: embedding backlog, recall hit rate, watch success/fail, auth rejects.
  - **Note:** Scope carefully — this is a template, not a deployed service. The right form here is a `domain-health` watch (in `watches.yaml`) that runs weekly, queries the DB, and appends a structured observation row. No external metrics system needed. "Recall hit rate" requires some definition of what a "hit" is — proxy it with "queries where recall returned ≥1 result" vs total queries. Auth rejects are only meaningful in HTTP mode.

- [ ] **P2-C2: Automated regression tests**
  - Add tests for schema init/migration, FTS sync, auth fail-closed, etc.
  - **Note:** Given this is a template repo (not a deployed service), scope to a `scripts/test.sh` that spins up a fresh memory.db, runs the critical paths (init, insert, FTS query, vec query, FTS trigger correctness, schema version check), and reports pass/fail. No CI required to get value — a local one-command smoke suite is sufficient and will catch the most common regressions. The FTS trigger fix (P0-C1) is the first test to write: insert a row, query FTS, assert it's found.

---

## 2. V3 Remaining Tranche & Enhancements
*Features and enhancements defined in SPEC-v3 and e2e walkthrough.*

- [ ] **Multi-device sync operational guide** (SPEC-v3 §6)
  - iCloud / Syncthing for sqlite-vec era; LanceDB migration path documented.
- [ ] **Model routing hooks** (SPEC-v3 §8)
  - `before_agent_start` hook + domain settings routing rules.
- [ ] **Natural-language authoring layer** (SPEC-v3 §7)
- [ ] **Package distribution** (SPEC-v3 §10)
- [ ] **Compounding intelligence loops** (SPEC-v3 §11)
  - Requires sustained memory DB usage to tune.
- [ ] **RPC watches** (SPEC-v3 §9)
  - Requires pi.dev structured stdin/stdout or wrapper process.

---

## 3. General Housekeeping & Walkthrough Follow-ups
- [ ] **Second E2E test:** Stand up an actual pi project from `base/`, run through session start → task → session end, verify memory injection and routing table work correctly.
- [ ] **Worked Examples:** Context files (`project.md`, `client.md`, etc.) need worked examples showing what "specific enough" looks like.
- [ ] **Opinionated Standards:** `global/AGENTS.md` template could be more opinionated about org-wide routing patterns.
- [ ] **Domain-specific skills:** (research, writing, code, ops) could be added to the universal skills library.
