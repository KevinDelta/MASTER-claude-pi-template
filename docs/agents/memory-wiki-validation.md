# Memory-Wiki Validation

Pre-adoption checklist for OpenClaw's `memory-wiki` plugin. Run these six binary checks before deciding whether to adopt `memory-wiki` as part of the template's durable knowledge layer. Captured as a tracked task per ADR 0005; not blocking the (II) collapse.

**Run status (2026-05-26):** Checks 1–5 complete. Check 6 incomplete — requires extended real-world usage. Results and pre-adoption requirements recorded in ADR 0006 (`docs/adr/0006-memory-wiki-adoption.md`).

## Why we're validating

`memory-wiki` is a strong candidate for the durable knowledge layer (compiled pages, structured claims with evidence/confidence, contradiction tracking, dashboards, Obsidian render mode). Adoption commits us to:

- 5 new tools (`wiki_status`, `wiki_search`, `wiki_get`, `wiki_apply`, `wiki_lint`)
- A new vault at `~/.openclaw/wiki/main/`
- A compile pipeline writing `.openclaw-wiki/cache/agent-digest.json` and `claims.jsonl`
- Routing-row updates and `DOCK.md` allowlist additions
- A `privacyTier` schema that may overlap or conflict with our DOCK rules

Worth doing if the dashboards and claim-tracking actually pay off; not worth doing if structured-claim authoring rots into the same prose we'd get from plain markdown.

## How to run the validation

Spin up a test agent (or a `--profile validation` instance to avoid touching real data), enable `memory-wiki` with `vaultMode: "isolated"`, and work through the six checks below. Each is binary: pass / fail. The decision tree at the bottom is mechanical.

```bash
openclaw --profile validation configure
openclaw --profile validation config set plugins.entries.memory-wiki.enabled true
openclaw --profile validation config set plugins.entries.memory-wiki.config.vaultMode isolated
openclaw --profile validation config set plugins.entries.memory-wiki.config.vault.renderMode obsidian
openclaw --profile validation wiki init
```

## The six checks

### 1. Obsidian render mode produces files the obsidian skills can read

Write an entity page via `wiki_apply` with `vault.renderMode: "obsidian"`. Then:

- Open the resulting markdown with the `obsidian-markdown` skill's expectations (frontmatter shape, wikilinks `[[…]]`, callouts `> [!note]`)
- Run `obsidian-cli search` against the wiki vault path and confirm the entity is findable

**Pass:** the produced markdown matches what those skills assume; cli search returns the entity. **Fail:** render mode produces a custom dialect that doesn't compose with the obsidian skills — adoption would require either custom rendering or dropping the obsidian-skills synergy.

### 2. `privacyTier` is enforced, not just labelled

Create a page with `privacyTier: local-private` and another with `privacyTier: confirm-before-use`. Run `wiki_search` from a simulated channel context (or via the agent in a non-local routing row).

**Pass:** non-public pages are not surfaced, or surfacing emits a clear warning. **Fail (just-labelled):** `privacyTier` is metadata only and we'd need to wrap `wiki_search` with our outbound DOCK layer to enforce. Adoption still possible but requires plugin-level work.

### 3. Compile pipeline is local-only

Run `openclaw wiki compile` while monitoring outbound network. Inspect `.openclaw-wiki/cache/` after compile completes.

**Pass:** no outbound network calls during compile; all artifacts under `.openclaw-wiki/cache/` on disk. **Fail:** compile makes any external call (analytics, telemetry, summarization API) — data-sovereignty concern, investigate further and potentially block adoption.

### 4. Bridge mode works with our Ollama-only `memory-core`

Switch to `vaultMode: "bridge"` with `bridge.readMemoryArtifacts: true`. Run `openclaw wiki bridge import`.

**Pass:** imports memory artifacts using the configured embedding provider (Ollama per ADR 0007); no attempt to re-embed via cloud. **Fail:** bridge import requires or auto-detects cloud embeddings, breaking ADR 0007 — adoption requires staying in `isolated` mode, losing the bridge benefit.

### 5. `wiki_lint` catches what it advertises

Write a page that intentionally:
- Contains a contradiction with another page (e.g., page A says "X is true," page B says "X is false")
- Has a claim with no evidence entries
- Has a claim with `confidence: 0.2`

Run `openclaw wiki lint`.

**Pass:** lint surfaces all three issues. **Fail:** lint is decorative — the dashboards exist but the underlying analysis isn't real. Adoption value drops significantly.

### 6. Structured-claim authoring feels natural over 5-10 real entries

Write 5-10 entries the way a real domain agent would over a week:
- A decision with reasoning (something like "we'll use Stripe over PayPal because…")
- An observation about a client preference
- A pattern observed across projects
- A claim with evidence pointing to a daily-note file
- A relationship between two entities (person → project)
- A synthesis rolling up multiple sources

Track: did the structure feel natural, or did the agent (and you) end up dumping prose into the `body` field and ignoring the `claims` / `evidence` schema?

**Pass:** the structure is used genuinely; lint catches missing fields when shortcuts are taken. **Fail:** the schema feels like ceremony; entries become flat prose with empty `claims: []` arrays. Without real claim data, the dashboards (`reports/claim-health.md`, `reports/contradictions.md`, `reports/low-confidence.md`) have nothing to track.

This check is the longest of the six — give it at least one real work-week of usage before deciding, not a one-sitting trial.

## Decision tree

After the six checks:

| Outcome | Action |
|---|---|
| All 6 pass | Adopt `memory-wiki` as template default. Write ADR 0008 documenting adoption + the routing-row updates + DOCK allowlist additions. Choose `isolated` or `bridge` mode based on check 4. |
| Checks 1, 3, 5, 6 pass; 2 fails | Adopt as default, but add an outbound DOCK wrapper around `wiki_search` that respects `privacyTier`. Document the wrapper requirement in the ADR. |
| Check 6 fails | Do not adopt. The structured-claims overhead doesn't earn its keep. Stay markdown-only. Capture the failure mode in an ADR so the question doesn't get reopened without new evidence. |
| Check 3 fails | Do not adopt. Sovereignty regression is non-negotiable per ADR 0007. |
| Check 4 fails, others pass | Adopt in `isolated` mode only. Skip bridge mode until OC's bridge import respects local embedding provider config. |
| Checks 1 or 5 fail | Adopt as opt-in (`install.sh --enable-wiki`), not default. Document the limitation in the ADR. |

## Recording the outcome

After validation runs:

1. Write **ADR 0008** capturing the decision (adopt / opt-in / reject) with the check results as the evidence section.
2. If adopting: update `domain/AGENTS.md` routing rows that should call `wiki_search` / `wiki_apply`; update `DOCK.md` Section D tool table; update `install.sh` to enable the plugin and write its config; update `CONTEXT.md` glossary with `memory-wiki`, `claim`, `synthesis`, `bridge mode`.
3. If rejecting: archive this validation file with a header note pointing at the rejecting ADR so future sessions don't re-run the same checks without new evidence.
