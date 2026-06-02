# Define Staged Areas as a Workspace Pattern

MASTER teaches staged work as a **Workspace Pattern** — the concrete folder mechanics that implement the ICM principles and the L0–L4 model adopted in **ADR 0009**. An area is either a **General Area** (uses `## Workflow`) or a **Staged Area** (uses `## Stage Sequence`). A Staged Area decomposes work into numbered stage folders, each carrying its own L2 contract (`CONTEXT.md`). Stages hand off through ICM's own mechanism — the upstream stage's `## Outputs` and the downstream stage's `## Inputs` — with no separate handoff control file and no status state machine.

This refines earlier ICM-inspired language into product vocabulary that fits MASTER's routing-table-first model. "Pipeline area" and "flat area" are retired; new scaffold, routing, and user-facing docs use **Staged Area** and **General Area**.

## Area mode

- **Either/or.** A General Area uses `## Workflow`; a Staged Area uses `## Stage Sequence`. Never keep both active in one area. Mode is declared implicitly: presence of numbered stage folders and a `## Stage Sequence` = Staged Area; otherwise General Area.
- **`## Stage Sequence` is operational authority** — it lists the active stage folders and what each produces. It is not a planning note; planned-but-absent stages stay in `Current State`, a plan doc, or an issue list until the stage folder exists.

## Stage shape

- **Stage folders live directly under the area** — no `stages/` wrapper. Names are two-digit and underscored: `01_discovery/`, `02_synthesis/`, `03_delivery/`.
- **Minimum scaffold = `CONTEXT.md` + `output/`.** A required empty `output/` uses `.gitkeep`. If a real stage has `CONTEXT.md` but lacks `output/`, the agent may create it during execution as recovery.
- **Optional folders: `references/`** (L3 stage-scoped factory) **and `scripts/`** (deterministic non-AI work — fetch, normalize, format).
- **No `scratch/`.** ICM has no scratch folder (Fig. 2). An agent's transient working context is its session/context window (OpenClaw persists session state); anything durable belongs in `output/` (the product) or memory. *(Reverses the earlier draft, which mandated a per-stage `scratch/`.)*
- **Loose files are ignored** by staged execution unless explicitly named by a stage's `## Inputs` or `## Working References`.

## Stage contract (the L2 file)

Each stage's `CONTEXT.md` has five canonical sections, in order:

1. **`## Inputs`** — L4 working artifacts this stage transforms or inspects (e.g. `../01_discovery/output/research.md`).
2. **`## Working References`** — L3 stable constraints it applies (voice rules, templates, prior decisions). This makes the factory/product split (ADR 0009 principle 5) explicit in the contract; ICM lists both layers under one Inputs table, MASTER separates them by section.
3. **`## Process`** — what the stage does.
4. **`## Outputs`** — what it writes, *naming the canonical output file(s)* so downstream has zero ambiguity about what to read.
5. **`## Verify`** — the checks the agent runs before the output is considered ready. Adopted from ICM §6.2's proposed `Verify` section; with no handoff control file, this is MASTER's traceability hook — the lightweight answer to "is this output sound?" and the anchor a downstream alignment edit traces back to (§4.5, §6.2).

Extra execution-relevant sections may follow; teaching comments and vague sections do not belong in a real stage file.

## Handoffs (pure ICM — no control file)

- **The handoff contract is carried by the contracts, not a file.** Upstream `## Outputs` names what it wrote; downstream `## Inputs` names what it reads (ICM §3.3). There is no `HANDOFF.md`, no `SUMMARY.md`, no `NEXT_STAGE.md`, and **no status enum**. *(Reverses the earlier draft's mandated `output/HANDOFF.md` with a `Draft/Ready/Blocked/Superseded` vocabulary — a small state machine ICM deliberately omits: "state management is the files on disk," and the framework creep §5.2 warns against.)*
- **State is implicit** — the current state of a Staged Area is which `output/` folders contain files and what they contain. Area-level `Current State` may note blockers; it does not duplicate per-stage status.
- **Readiness = invocation.** In the default mode, the human reviewing `output/` and invoking the next stage *is* the ready signal — the edit gate (ADR 0009 principle 4).

## Execution mode

- **`mode: human-gated` (default)** — each stage requires explicit invocation; the invocation is the edit gate.
- **`mode: autonomous`** — the area walks its own stages end-to-end without pausing; for heartbeat-driven or trusted-routine pipelines. Grounded in ICM §4.1/§4.4: a single orchestrating session walks all stages, delegating sub-tasks, driven by the folder structure.
- Mode is declared in the area `CONTEXT.md` header, not per stage.

## Human attention follows a U-shape (guidance, not a rule)

ICM §4.5 / Fig. 5 report that human editing concentrates at the first stage (direction-setting) and the final stage (alignment), with light editing in the middle. MASTER uses this as heuristic guidance: the first and final stages are the natural candidates for a "requires human approval" note in the stage or area contract; middle stages run on default readiness. Heuristic, not enforced.

## Skill-flavor scoping (extends ADR 0001)

Producer-skills (those declaring `Template:` front-matter, which own a deliverable's shape) are valid in **General Areas only**. A Staged Area's stage owns its output shape directly via its `## Outputs` section (and an optional `Template:` reference in the stage `CONTEXT.md`). Loading a producer-skill from a staged-stage routing row splits the per-stage contract across two surfaces — a documented rule now, and a lint error once the deferred `scripts/lint-skills.mjs` workspace-pattern checks land (see Considered Options).

## Routing

Staged work resolves through `AGENTS.md` (ADR 0009: L1 = `AGENTS.md`). A **stage-targeted routing row** points at a specific stage folder (`/areas/research/01_discovery`) for human-gated areas; an autonomous area's row targets the area root and walks the stages. `base/AGENTS.md` ships a generic, skill-free `Staged area / next stage` row.

## Considered Options

- **Keep a single canonical `output/HANDOFF.md` with a status enum.** Rejected — pared toward ICM minimalism. ICM's `output/` holds named files (§3.3); the handoff contract already lives in the Inputs/Outputs sections. A mandated control file with a status vocabulary is a state machine ICM deliberately avoids.
- **Keep "pipeline area" / "flat area."** Rejected. "Pipeline" implies an automated runner MASTER does not have; "flat" defines the default by absence. Staged Area / General Area name the real distinction.
- **Mandate a per-stage `scratch/`.** Rejected — not in ICM; the agent's transient context is its session, not a folder.
- **Three-section ICM contract (Inputs / Process / Outputs only).** Rejected. `Working References` makes the factory/product split explicit in the contract; `Verify` is the traceability hook that stands in for the removed handoff file.
- **Add full staged-area validation now.** Deferred. A workspace-pattern linter should come after several real Staged Areas exist; freezing rules prematurely is the bigger risk.
- **Ship a concrete example staged area.** Deferred. A sample would be artificial or bias users toward one workflow; the first pass provides clear description only.

## Consequences

- Implements ADR 0009's principles and L0–L4 model as concrete folder mechanics. The two ADRs are complementary: 0009 is the conceptual frame, 0010 is the pattern.
- First-pass surfaces to update: `base/README.md` gains durable vocabulary (Area, General Area, Staged Area, Stage); the `base/areas/example-area-*/CONTEXT.md` scaffolds gain a disposable General-vs-Staged annotation; `scripts/apply-intake.mjs` generates the same either/or guidance so intake projects don't drift; `base/AGENTS.md` gets the generic staged-area row.
- The glossary (`CONTEXT.md`) replaces "Pipeline area"/"Flat area" with "Staged Area"/"General Area" and drops handoff-file and status-enum language.
- **Not in this pass:** no `HANDOFF.md`, no status enum, no `scratch/`, no `stages/` wrapper, no staged-area validation, no concrete example stage folders.
