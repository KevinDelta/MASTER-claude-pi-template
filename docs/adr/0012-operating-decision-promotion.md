# Promote linked operating-decisions from append-log to discrete records

Operating decisions (pricing bands, supplier shifts, scope renegotiations — distinct from the framework-architecture decisions recorded as ADRs) live as append-log entries in `base/context/decisions.md` (project) or `domain/context/decisions.md` (domain) by default. When another load-bearing file — a stage `CONTEXT.md`, a skill, a routing row — explicitly cites a decision, it is **promoted** to a discrete record at `base/decisions/<YYYY-MM>-<slug>.md` (or `domain/decisions/<YYYY-MM>-<slug>.md`) using the shape `## Context / ## Options / ## Decision / ## Consequences / ## Owner`, and the append-log entry is replaced by a pointer. The rule: **if a decision is linked, it must be a discrete record; otherwise it's an append-log line.** This mirrors the inbox `_inbox/ → distill → _processed/` lifecycle (ADR 0002).

*Originally bundled into the ICM adoption draft; split out here because operating-decision lifecycle is orthogonal to ICM.*

## Considered Options

- **All operating decisions as discrete records from the start.** Rejected — high ceremony for decisions nobody references; the append log stays low-friction and scannable.
- **All operating decisions as append-log only.** Rejected — a linked decision needs a stable address and the fuller record shape; a log line can't be cited reliably from a stage contract or skill.

## Consequences

- `install.sh` seeds `base/decisions/_template.md` and `domain/decisions/_template.md` from the record shape.
- Lighter than a framework ADR: no `Status` lifecycle and no formal supersession chain, though a record may note `Superseded by: <slug>`.
