# Require a fixed section outline in SOUL.md

`SOUL.md` stays a single monolithic persona file (one persona = one file) but must contain a required internal outline — `## Mission`, `## Voice`, `## Principles`, `## Constraints` — so routing rows can address one section (`SOUL.md#voice`) and load only that slice. This is **layered context loading (ADR 0009, principle 3) applied to the persona file**: a drafting skill loads `SOUL.md#voice` without dragging in mission, principles, and constraints. `scripts/lint-skills.mjs` validates section presence and resolves `file#section` addresses.

*Originally bundled into the ICM adoption draft; split out here because persona file shape is orthogonal to ICM.*

## Considered Options

- **Split the persona into separate files (`mission.md`, `voice.md`, …).** Rejected. One persona is a coherent thing; splitting risks drift between the parts and forces OpenClaw's `SOUL.md` load contract to be renegotiated or worked around with a concatenation build step. A required outline inside one file preserves both slice-loading and file-level identity.
- **No required sections (free-form `SOUL.md`).** Rejected. Section addressing (`SOUL.md#voice`) only works if the sections reliably exist; without enforcement, addresses silently resolve to nothing.

## Consequences

- `scripts/lint-skills.mjs` enforces the four sections and validates section addresses in routing rows.
- Multiple personas in one domain go in separate SOUL files (`domain/examples/SOUL.*.md`); splitting one persona across multiple files remains out of bounds.
