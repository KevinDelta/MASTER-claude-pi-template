# Foundation Backlog — Central Bet Hardening

**Last updated:** 2026-04-24  
**Purpose:** Turn the framework stress test into an implementation backlog that hardens worker-owned, portable, compounding operational memory.

---

## Guiding Principle

The central bet is only true if the system is:
1. **Correct** — memory is reliably captured and retrievable.
2. **Safe** — sensitive data is protected and exports are policy-bounded.
3. **Portable** — workers can move and restore memory without loss.
4. **Operable** — behavior is observable, testable, and resilient under load.

---

## Current Risk Summary

| Bucket | Risk Level | Why It Matters |
|---|---|---|
| Security & data governance | Critical | One auth or data-leak flaw breaks trust in worker-owned memory. |
| Memory correctness | High | Recall quality degrades if indexing/embedding pipelines drift. |
| Retrieval quality | High | Poor ranking/injection makes memory feel unreliable. |
| Portability & sync | High | Portability claim fails without safe backup/sync operations. |
| Runtime reliability | Medium | Watch/session instability weakens daily usage trust. |
| Testability & observability | High | No hard proof loops means regressions ship silently. |

---

## Roadmap Phases

| Phase | Window | Goal |
|---|---|---|
| **P0** | 0–3 weeks | Close security and correctness gaps that can violate trust. |
| **P1** | 3–8 weeks | Strengthen memory lifecycle, governance, and retrieval reliability. |
| **P2** | 8–12 weeks | Add operational guarantees, observability, and sync hardening. |

---

## P0 — Trust Boundary Hardening (0–3 weeks)

### Epic P0-A: MCP Auth Must Fail Closed

**Issue P0-A1 — Enforce required token in HTTP mode**  
**Target files:** `domain/.pi/mcp-server.ts`, `domain/.pi/extensions/.env.example`, `install.sh`  
**Change:** In `PI_MCP_TRANSPORT=http`, reject startup if `PI_WORKER_TOKEN` is missing/empty.  
**Acceptance criteria:**
- Server exits non-zero when HTTP mode is enabled and token is unset.
- Requests without a valid bearer token always return unauthorized.
- Docs/env examples clearly mark token as required in HTTP mode.

**Issue P0-A2 — Add token-strength validation + generation path**  
**Target files:** `install.sh`, `PI_DOCK.md`, `xDOCS/BLUEPRINT.md`  
**Change:** Generate secure token during install if absent; validate minimum entropy/length.  
**Acceptance criteria:**
- Installer writes a strong default token and prints rotation instructions.
- Token rotation procedure documented.

---

### Epic P0-B: Export Policy Enforcement

**Issue P0-B1 — Replace raw observation payloads in host responses**  
**Target files:** `domain/.pi/mcp-server.ts`, `PI_DOCK.md`  
**Change:** `query_memory` returns sanitized snippets + metadata, never full raw tool logs.  
**Acceptance criteria:**
- No endpoint returns raw `observations.content` verbatim by default.
- Response schema includes `source_kind`, `project`, `timestamp`, `snippet`.
- Policy text and implementation match exactly.

**Issue P0-B2 — Redact secrets before memory write**  
**Target files:** `domain/.pi/extensions/memory-db.ts`  
**Change:** Add redaction filter for API keys, bearer tokens, `.env`-style values, credential patterns before insert.  
**Acceptance criteria:**
- Redaction runs for `tool_call`, `tool_call_error`, and any manual note ingestion paths.
- Unit tests cover at least 10 representative secret patterns.
- Redacted payload includes marker (`[REDACTED]`) and reason code.

---

### Epic P0-C: Memory Correctness Baseline

**Issue P0-C1 — Add FTS sync triggers**  
**Target files:** `domain/.pi/extensions/memory-db.ts`  
**Change:** Create explicit SQLite triggers for insert/update/delete sync between `observations` and `observations_fts`.  
**Acceptance criteria:**
- Trigger set exists after DB init and is idempotent.
- FTS query returns newly inserted/updated observations in same session.
- Integrity check command documented in `skills/memory-db.md`.

**Issue P0-C2 — Schema version table and migration scaffold**  
**Target files:** `domain/.pi/extensions/memory-db.ts`, `skills/memory-db.md`  
**Change:** Add `_schema_version` table and migration runner pattern.  
**Acceptance criteria:**
- Fresh DB initializes to current schema version.
- Older schema upgrades forward without data loss.
- Migration path documented with rollback guidance.

---

## P1 — Memory Lifecycle + Retrieval Reliability (3–8 weeks)

### Epic P1-A: Embedding Pipeline Robustness

**Issue P1-A1 — Backfill cursor to prevent starvation**  
**Target files:** `domain/.pi/extensions/memory-db.ts`  
**Change:** Track last embedded observation ID and process oldest-unembedded first.  
**Acceptance criteria:**
- Repeated runs eventually embed all rows (no perpetual tail starvation).
- Backfill progress metric logged each `agent_end`.

**Issue P1-A2 — Retry/error accounting for embedding failures**  
**Target files:** `domain/.pi/extensions/memory-db.ts`  
**Change:** Persist per-row failure counts and last error for embedding calls.  
**Acceptance criteria:**
- Failed rows are retried with bounded backoff.
- Rows exceeding retry budget are flagged for operator review.

---

### Epic P1-B: Retrieval Ranking Quality

**Issue P1-B1 — Hybrid ranking model**  
**Target files:** `domain/.pi/extensions/memory-db.ts`, `domain/.pi/mcp-server.ts`  
**Change:** Replace simple merge-dedupe with scoring across semantic similarity, recency, project match, and observation kind.  
**Acceptance criteria:**
- Ranking function is explicit and configurable.
- Offline eval set shows improvement vs current baseline.

**Issue P1-B2 — Token-aware context injection**  
**Target files:** `domain/.pi/extensions/memory-db.ts`  
**Change:** Replace char-budget heuristic with token estimation or bounded chunking strategy.  
**Acceptance criteria:**
- Injection size remains within configured budget ±10%.
- No truncation of structured list headers or task bullets.

---

### Epic P1-C: Governance and Scope Controls

**Issue P1-C1 — Host query scoping policy**  
**Target files:** `domain/.pi/mcp-server.ts`, `PI_DOCK.md`  
**Change:** Add optional project allowlist/denylist per host session.  
**Acceptance criteria:**
- Query can be constrained to authorized projects only.
- Unauthorized project data is excluded and audit-logged.

**Issue P1-C2 — Data retention + archival policies**  
**Target files:** `domain/.pi/extensions/memory-db.ts`, `skills/memory-db.md`  
**Change:** Implement retention tiers by observation kind and age.  
**Acceptance criteria:**
- Policy can be enabled/disabled by config.
- Archived rows remain recoverable via export.

---

## P2 — Operability, Portability, and Sync Hardening (8–12 weeks)

### Epic P2-A: Backup/Restore and Portability Guarantees

**Issue P2-A1 — Signed export/import workflow**  
**Target files:** `domain/.pi/extensions/memory-db.ts` (or utility script), `skills/memory-db.md`  
**Change:** Add CLI flow for export/import with checksum verification and schema compatibility checks.  
**Acceptance criteria:**
- Worker can move domain memory between machines with integrity verification.
- Import fails safely on version mismatch unless explicit upgrade flag provided.

**Issue P2-A2 — Recovery drill docs + scripted checks**  
**Target files:** `xDOCS/BLUEPRINT.md`, `skills/memory-db.md`  
**Change:** Add standard recovery runbook (restore from backup, verify counts/indexes, smoke query).  
**Acceptance criteria:**
- Recovery runbook can be executed end-to-end in under 30 minutes.

---

### Epic P2-B: Multi-Device SQLite Era Safety

**Issue P2-B1 — Single-writer lock protocol**  
**Target files:** `xDOCS/SPEC-v3.md`, `xDOCS/BLUEPRINT.md`, optional helper script  
**Change:** Define explicit lock/lease mechanism for filesystem sync era.  
**Acceptance criteria:**
- Concurrent write attempts are detectable.
- Operator guidance includes conflict resolution steps.

**Issue P2-B2 — Sync conflict detector**  
**Target files:** utility script + docs  
**Change:** Add periodic check for divergent sequence signatures between devices/backups.  
**Acceptance criteria:**
- Conflicts are surfaced before DB corruption propagates.

---

### Epic P2-C: Observability + Test Harness

**Issue P2-C1 — Runtime health metrics**  
**Target files:** `domain/.pi/extensions/memory-db.ts`, `domain/.pi/mcp-server.ts`  
**Change:** Emit structured health metrics: embedding backlog, recall hit rate, watch success/fail, auth rejects.  
**Acceptance criteria:**
- Metrics can be queried from DB or logs without code changes.
- Threshold-based alerts documented.

**Issue P2-C2 — Automated regression tests**  
**Target files:** test harness directory (new), CI config (if adopted)  
**Change:** Add tests for schema init/migration, FTS sync, auth fail-closed, allowlist enforcement, redaction behavior.  
**Acceptance criteria:**
- Critical-path tests run locally in one command.
- Release checklist requires green test suite before merge.

---

## Dependency Order (Critical Path)

1. `P0-A1` → `P0-B1` → `P0-B2`  
2. `P0-C1` → `P0-C2`  
3. `P1-A1` → `P1-A2`  
4. `P1-B1` → `P1-B2`  
5. `P1-C1` + `P1-C2`  
6. `P2-A1` → `P2-A2`  
7. `P2-B1` → `P2-B2`  
8. `P2-C1` → `P2-C2`

---

## Definition of Done (Foundation)

The foundation is considered hardened when all conditions are true:
- No unauthenticated host access path exists in HTTP transport mode.
- Host exports are policy-safe by default; raw memory is not leaked.
- Memory write pipeline includes redaction and index correctness guarantees.
- Schema upgrades are versioned and repeatable.
- Recall quality is measured and improved over baseline on a fixed eval set.
- Worker memory can be exported, verified, restored, and queried after migration.
- Critical-path regressions are covered by automated tests.

