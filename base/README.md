# Project — README

This folder is a **project workspace** inside an OpenClaw domain. It was scaffolded by `install.sh --project-slug <name>` and lives at `~/.openclaw/workspace/projects/<slug>/`. Read this file first if you're a human; the agent reads `AGENTS.md` for routing.

The structure is the system. If the folders are legible, a standard LLM can navigate them and act on them — no framework, no agents-of-agents, no vendor lock-in.

---

## The five layers

| Layer | Folder / File | What it answers |
|---|---|---|
| **Identity** | `SOUL.md` | Who is this agent? How does it sound and think? What principles guide its trade-offs? |
| **World model** | `context/` | What does the agent need to know about this project, client, stack, and prior decisions? |
| **Workflows** | (skills, loaded by routing) | How does the agent produce specific deliverables or modify its behavior? |
| **Shapes** | `templates/` | What format do recurring deliverables take (executive brief, weekly status, meeting notes)? |
| **Working surfaces** | `areas/` | Where does active work happen? Each area has its own `CONTEXT.md` with purpose, workflow, and current state. |
| **Inbox** | `inbox/` | Where do raw human-fed artifacts (call transcripts, notes, clipped articles) wait to be distilled into the structured parts above? |

`AGENTS.md` is the routing table — the operational heart that maps every task type to **what to read**, **where to work**, and **which skills to load**. `TOOLS.md` declares the project's tool policy. Memory (SQLite) and heartbeat (recurring work) are owned by OpenClaw — see the domain workspace.

---

## Areas: General vs Staged

Every directory under `areas/` is one of two kinds, declared **implicitly** by its shape (see [ADR-0010](../docs/adr/0010-staged-area-workspace-pattern.md)):

- **General Area** — one-shot work. Artifacts land directly inside `areas/<area>/`. Its `CONTEXT.md` has a `## Workflow` section. Use it when stage decomposition would be theater (a single draft, a one-shot triage). This is the default.
- **Staged Area** — work that decomposes into numbered, ordered **stages** with a human edit gate between them (e.g. research → synthesis → delivery). Its `CONTEXT.md` has a `## Stage Sequence` section listing the active stages, and the area contains numbered **stage** folders.

A **Stage** is one numbered step inside a Staged Area:

- Folders live directly under the area, two-digit and underscored: `01_discovery/`, `02_synthesis/`, `03_delivery/` — no `stages/` wrapper.
- Minimum scaffold is `CONTEXT.md` + `output/`. Optional: `references/` (stage-scoped reference material) and `scripts/` (deterministic non-AI work — fetch, normalize, format). There is no `scratch/`; the agent's transient working context is its session.
- The stage `CONTEXT.md` is a five-section contract, in order: `## Inputs` (the working artifacts it transforms) · `## Working References` (the stable rules it applies) · `## Process` · `## Outputs` (names the canonical output file) · `## Verify` (the checks run before the output is ready).
- **Handoffs carry through the contracts, not a control file.** The upstream stage's `## Outputs` names what it wrote; the downstream stage's `## Inputs` names what it reads. There is no `HANDOFF.md` and no status enum — the state of a Staged Area *is* which `output/` folders contain files.

Pick the kind by the work, not by default-to-staged: most areas are General. Reach for a Staged Area only when distinct steps each deserve their own edit gate.

---

## How an agent navigates this folder

For any non-trivial task the agent resolves a routing row in `AGENTS.md`, then reads in this order:

1. **`SOUL.md`** — voice, principles, persona. The lens.
2. **`context/` files named by the routing row's `Read` column** — project / client / stack / decisions, only the relevant subset.
3. **The area's `CONTEXT.md`** — purpose, workflow, current state, standards for the workspace where the work lands.
4. **Any skills the row loads** — workflow or behavior-modifier. A producer skill will reference a `templates/` shell via `Template:` front-matter.
5. **`templates/<shell>.md`** — the output shape, if the skill produces a templated deliverable.
6. **`inbox/_inbox/`** — only when the task is explicitly to distill, otherwise ignored.

If the routing row can't be matched, the agent falls back to the domain `AGENTS.md`. If a task type isn't in either, the agent **asks** rather than invents. Hallucinated client preferences, fabricated KPIs, and invented decisions are the failure mode this whole structure exists to prevent.

---

## Worked example — "Generate next month's S&OP brief"

Borrowed from the supply-chain reference template to show the flow end-to-end. Replace the contents above with your own work; this example stays as documentation.

1. **Task arrives**: "Produce next month's S&OP executive brief."
2. **Routing lookup**: the agent matches the `Write / draft` row in `AGENTS.md`. The row says: Area = `/areas/briefings`, Read = `context/project.md` + `context/client.md` + `briefings/CONTEXT.md`, Load Skills = `stop-slop.md`, and the producer skill `skills/sop-brief.md` declares `Template: executive-brief.md` in its front-matter.
3. **Lens load**: agent reads `SOUL.md` — knows the leader's voice (direct, dry, data-first) and principles (cost vs. service trade-off bias, ethics guardrails).
4. **World-model load**: agent reads `context/project.md` (this engagement's scope), `context/client.md` (the leader's communication preferences), and `areas/briefings/CONTEXT.md` (where briefs live, the workflow, current state).
5. **Skill load**: agent reads `skills/sop-brief.md` — gets the step-by-step (gather forecast / actuals / exceptions, surface deltas, draft).
6. **Template load**: agent opens `templates/executive-brief.md` — knows the output shape (TL;DR, situation, options, recommendation, asks).
7. **Decision check**: agent reads recent entries in `context/decisions.md` — checks for anything in the last 30 days that affects the brief (e.g. a new sourcing decision that changes which options are still live).
8. **Production**: agent fills the template. Any input it doesn't have (last month's actuals, a specific exception status) → it asks, doesn't invent.
9. **Self-edit**: `stop-slop.md` skill applies on output — hollow openers, vague superlatives, and padding get cut before review.
10. **Session end**: `Session end` routing row triggers `memory-write.md` and `context-update.md` — observations land in SQLite, `briefings/CONTEXT.md` "Current State" reflects what shipped.

The point: the leader doesn't re-explain the business each month. The folder remembers.

---

## How to evolve this project

This structure is meant to **compound**, not stay frozen:

- **Raw input → `inbox/_inbox/`.** After every meaningful call, meeting, or document the agent should eventually see, drop it in `inbox/_inbox/`. When you're ready, ask the agent to *distill* — it processes one item, proposes where each insight belongs (principle? decision? new skill? memory write?), and archives the source in `inbox/_processed/`. See [`inbox/README.md`](inbox/README.md).
- **Recurring themes → promote up.** When a pattern repeats across several inbox items or sessions, promote it: add a principle to `SOUL.md`, write a new entry in `context/decisions.md`, or stub a new `skills/<name>.md`.
- **Deliverable shape stabilizing → new template.** When you find yourself wanting the same shape for a recurring output that doesn't fit `executive-brief` / `weekly-status` / `meeting-notes`, add a new file in `templates/` and have the producer skill reference it via `Template:` front-matter.
- **Big architectural choice → ADR.** Most decisions belong in the one-line `context/decisions.md` log. When a decision is hard to reverse, surprising without context, and the result of a real trade-off, escalate to a proper ADR in the workspace's `docs/adr/`.

The system improves by the weight of decisions and dialogue you feed into it — not by adding tooling.

---

## Pointers

- **Routing table and operating contract**: [`AGENTS.md`](AGENTS.md)
- **General vs Staged Areas, stage contracts**: [ADR-0010](../docs/adr/0010-staged-area-workspace-pattern.md)
- **Tool policy**: [`TOOLS.md`](TOOLS.md)
- **Voice and principles**: [`SOUL.md`](SOUL.md)
- **Output shells**: [`templates/`](templates/)
- **Raw artifact intake**: [`inbox/README.md`](inbox/README.md)
- **Decision log conventions**: [`context/decisions.md`](context/decisions.md)
- **System-level architecture** (for people changing the template itself): `../../xDOCS/BLUEPRINT.md` from the template repo
