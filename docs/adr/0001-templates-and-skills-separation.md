# Templates and skills are separate concepts

A *skill* is a workflow (the steps to produce something or modify behavior). A *template* is an output shell (the shape a deliverable takes). They are kept separate so the format of a deliverable can evolve independently from the process that produces it, and so one template can be filled by many skills.

## Considered Options

- **Skills own format.** Status quo. Rejected because it entangles process and shape — changing the format of a weekly status forces editing the skill, and two skills that produce the same shape duplicate it.
- **Templates referenced via a new column in the routing table.** Rejected because most routing rows do not produce a templated deliverable (Session start, Plan, Research, Document, Harness), so the column would be `—` for the majority of rows.
- **Templates referenced via optional `Template:` front-matter on producer skills.** Accepted. Scoped to the skills that actually produce shaped output, keeps the routing table clean, makes the skill's output contract explicit without coupling the skill to the format itself.

## Consequences

- Two implicit flavors of skill emerge: *producer skills* (have a `Template:` line) and *modifier skills* (no template — e.g. `stop-slop`, `memory-write`, `doc-authoring`). This distinction is convention, not a typed schema.
- Templates live at `base/templates/` with optional `base/areas/*/templates/` overrides, mirroring the global → domain → project inheritance pattern already used by routing.
- Pure-shell templates with comment hints only — no filled-in example content, which would bias the agent toward copying.
