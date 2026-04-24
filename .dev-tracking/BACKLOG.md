# Unified Backlog — MASTER-claude-pi-template

This backlog consolidates all open tasks, hardening efforts, and the V3 remaining tranche.

## 1. Foundation Hardening (Central Bet)
*Extracted from the former FOUNDATION-BACKLOG.md. The central bet is only true if the system is Correct, Safe, Portable, and Operable.*

### P0 — Trust Boundary Hardening (0–3 weeks)
- [ ] **P0-A1: Enforce required token in HTTP mode**
  - Reject startup in `mcp-server.ts` if `PI_MCP_TRANSPORT=http` and `PI_WORKER_TOKEN` is missing.
- [ ] **P0-A2: Add token-strength validation + generation path**
  - Generate secure token during `install.sh` if absent; validate minimum entropy/length.
- [ ] **P0-B1: Replace raw observation payloads in host responses**
  - `query_memory` returns sanitized snippets + metadata, never full raw tool logs.
- [ ] **P0-B2: Redact secrets before memory write**
  - Add redaction filter for API keys, bearer tokens, etc. in `memory-db.ts` before insert.
- [ ] **P0-C1: Add FTS sync triggers**
  - Explicit SQLite triggers for insert/update/delete sync between `observations` and `observations_fts`.
- [ ] **P0-C2: Schema version table and migration scaffold**
  - Add `_schema_version` table and migration runner pattern to `memory-db.ts`.

### P1 — Memory Lifecycle + Retrieval Reliability (3–8 weeks)
- [ ] **P1-A1: Backfill cursor to prevent starvation**
  - Track last embedded observation ID and process oldest-unembedded first.
- [ ] **P1-A2: Retry/error accounting for embedding failures**
  - Persist per-row failure counts and last error for embedding calls.
- [ ] **P1-B1: Hybrid ranking model**
  - Replace simple merge-dedupe with scoring across semantic similarity, recency, project match, etc.
- [ ] **P1-B2: Token-aware context injection**
  - Replace char-budget heuristic with token estimation or bounded chunking strategy.
- [ ] **P1-C1: Host query scoping policy**
  - Add optional project allowlist/denylist per host session.
- [ ] **P1-C2: Data retention + archival policies**
  - Implement retention tiers by observation kind and age.

### P2 — Operability, Portability, and Sync Hardening (8–12 weeks)
- [ ] **P2-A1: Signed export/import workflow**
  - Add CLI flow for export/import with checksum verification and schema compatibility checks.
- [ ] **P2-A2: Recovery drill docs + scripted checks**
  - Add standard recovery runbook to `BLUEPRINT.md` and `memory-db.md`.
- [ ] **P2-B1: Single-writer lock protocol**
  - Define explicit lock/lease mechanism for filesystem sync era.
- [ ] **P2-B2: Sync conflict detector**
  - Add periodic check for divergent sequence signatures between devices/backups.
- [ ] **P2-C1: Runtime health metrics**
  - Emit structured health metrics: embedding backlog, recall hit rate, watch success/fail, auth rejects.
- [ ] **P2-C2: Automated regression tests**
  - Add tests for schema init/migration, FTS sync, auth fail-closed, etc.

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
