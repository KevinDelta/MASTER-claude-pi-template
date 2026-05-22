# Inbox and memory are separate stores

The `inbox/` folder (human-fed raw artifacts) and the memory plugin's SQLite store (agent-observed structured facts) are kept independent. Distilling an inbox item never auto-writes to memory; the human decides what crosses that boundary during a gated distillation step.

## Considered Options

- **Pipeline.** Distillation of an inbox item triggers a memory write for each extracted observation. Rejected because it conflates provenance — memory becomes a mix of "what the agent observed during its own work" and "what the human pasted in," and the agent loses the ability to trust memory as a record of its own ground truth.
- **Replacement.** Inbox replaces the narrative half of memory; SQLite stays for structured observations. Rejected because MEMORY.md serves a different purpose (orientation at session start), not raw capture.
- **Independent.** Accepted. Inbox is the human's feed-in surface (compatible with Obsidian-style note flows); memory is the agent's own recall surface. They compose only through deliberate human-gated promotion.

## Consequences

- Inbox lives at `base/inbox/` (project-scoped) and `domain/inbox/` (cross-project), with the convention `_inbox/` (incoming) → `_processed/` (archived after distillation).
- A `Distill inbox` routing row gates the workflow — never auto-distills, always confirms with the human where each insight belongs (pillar / skill / decision / memory).
- The inbox folder is safe to point at an external sync source (Obsidian vault, Drive folder) without polluting agent memory.
