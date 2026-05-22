# distill-inbox

Process one raw artifact from `inbox/_inbox/` into the structured parts of the project, then archive the source. Human-gated at every step.

## When to load

Routing row: **Distill inbox** — when the user asks to process inbox items, clear the inbox, or "make sense of" something they dropped in.

## Inputs

- One file from `inbox/_inbox/` (the human names which one, or the agent picks oldest and confirms)
- Read access to `context/`, `SOUL.md`, `AGENTS.md`, `templates/`, recent `decisions.md` entries

## Workflow

1. **Pick the artifact.** If the user named one, use it. Otherwise list the inbox contents and confirm which one to process.
2. **Read it once, end to end.** No partial-read shortcuts. Note speakers, dates, decisions, recurring themes.
3. **Propose extractions.** For each insight worth keeping, classify it and surface it to the user:
   - **Decision** → propose an append to `context/decisions.md` (or escalation to a workspace ADR if reasoning is more than one line — see the decisions log comment)
   - **Principle** → propose an addition to `SOUL.md` `## Principles`
   - **Project context update** → propose an edit to `context/project.md` or `context/client.md`
   - **New skill needed** → propose a stub `skills/<name>.md` for the user to fill in later
   - **Memory write** → propose a memory observation, but **only with explicit user confirmation** (the inbox/memory boundary in [docs/adr/0002](../docs/adr/0002-inbox-memory-provenance-separation.md))
   - **Discard** — most raw content is context for a single moment and shouldn't be promoted anywhere
4. **Wait for confirmation on each.** Never batch-apply. Each proposed edit is a separate yes/no.
5. **Apply confirmed edits.** Make the actual file changes.
6. **Optionally render meeting-notes.** If the artifact was a call/meeting transcript, offer to render a `meeting-notes.md` deliverable using the template (`base/templates/meeting-notes.md`).
7. **Archive.** Move the source from `inbox/_inbox/` to `inbox/_processed/`. Preserve the filename.
8. **Report.** Summarize: what was distilled where, what was discarded, what's still pending in the inbox.

## Hard rules

- Never auto-write to memory. Always confirm.
- Never modify `SOUL.md` voice/tone sections — only the `## Principles` section may grow from inbox distillation.
- Never delete inbox files. Archive only.
- If the user interrupts mid-distillation, leave the source in `_inbox/` (not in `_processed/`) so it can be resumed.

## Out of scope for this skill

- Producing deliverables from inbox content (use a producer skill that references a template instead)
- Bulk-distilling multiple inbox items in one pass (process one at a time)
- Syncing the inbox to external sources (that's the user's job — Obsidian, Drive, etc.)
