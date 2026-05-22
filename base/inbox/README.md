# Inbox

Human-curated staging area for raw upstream artifacts: call transcripts, meeting notes, voice-memo dumps, clipped articles, screenshots-with-context, client emails — anything you want the agent to be able to *eventually* see, but that hasn't been distilled into the structured parts of the project yet.

## How it works

```
inbox/
├── _inbox/        ← drop new artifacts here
└── _processed/    ← archive moves here after distillation
```

1. **Drop**: paste, save, or sync raw artifacts into `_inbox/`. Filename should hint at what it is — `2026-05-21_acme-qbr-call.md`, `client-email-pricing-pushback.txt`. No structure required.
2. **Distill**: trigger the `Distill inbox` routing row. The agent reads one item at a time, proposes where each insight belongs (a pillar/principle edit, a new skill, a decisions-log entry, a memory write), and asks you to confirm each.
3. **Archive**: after distillation, the source file moves to `_processed/`. Git history preserves it; it's no longer in the agent's active read path.

## Why this is separate from memory

The memory plugin (SQLite + sqlite-vec) stores things the **agent observed during its own work** — facts it has direct provenance over. The inbox stores things **you fed it** — second-hand context with human provenance.

Distillation never auto-writes to memory. The human decides what crosses that boundary. See [docs/adr/0002-inbox-memory-provenance-separation.md](../../docs/adr/0002-inbox-memory-provenance-separation.md).

This means it is safe to point `_inbox/` at an external sync source (Obsidian vault, Drive folder, Dropbox) without polluting agent memory.

## What does *not* belong here

- **Structured project context** — that goes in `context/` (project, client, stack, decisions).
- **Working drafts and deliverables** — those live in `areas/` once you're actively producing them.
- **Anything secret** — `.env`, credentials, auth files. The agent's Out of Bounds rules apply here too.
- **Anything the agent already knows from `context/` or memory** — no point staging it again.

## Naming conventions

- Prefer dated prefixes for time-bound artifacts: `YYYY-MM-DD_short-slug.ext`
- Use the source extension (`.md`, `.txt`, `.eml`, `.vtt`, `.json`) — the agent figures it out
- Keep filenames descriptive enough that you can tell what's pending without opening each file
