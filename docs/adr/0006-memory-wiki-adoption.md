# memory-wiki adoption decision

Status: proposed — pending Check 6 (extended real-world usage)

Evaluating whether to adopt OpenClaw's `memory-wiki` plugin as a template default for structured knowledge (compiled entity/synthesis pages, claim tracking, contradiction detection, Obsidian-compatible vault). The plugin ships with OC 2026.5.22 (`stock:memory-wiki/index.js`, disabled by default).

## Validation results (2026-05-26)

Run against a clean `--profile validation` instance with `vaultMode: isolated`, `vault.renderMode: obsidian`, vault at `~/.openclaw-validation/wiki/main`.

| Check | Result | Notes |
|-------|--------|-------|
| 1. Obsidian render mode | Partial pass | YAML frontmatter and wikilinks in index files confirmed. `obsidian-cli search` returns no matches — requires vault registration in the Obsidian app; not a markdown correctness failure |
| 2. privacyTier enforced | Fail (just-labelled) | `local-private` pages appear in `wiki_search` results without filtering; tier is metadata only. See wrapper requirement below |
| 3. Compile is local-only | Pass | No outbound network calls during compile; all cache artifacts (`agent-digest.json`, `claims.jsonl`) written locally |
| 4. Bridge + local embeddings | Partial pass | Embedding provider is `local` transport (OC built-in HuggingFace GGUF), not Ollama. No cloud provider auto-detected. Bridge import not fully testable — no exported artifacts in clean profile; no `bridge_import` op exposed via `wiki_apply` |
| 5. `wiki_lint` catches what it advertises | Pass | Contradictions, low-confidence claims, and missing evidence all flagged correctly |
| 6. Structured-claim authoring over real usage | Incomplete | Requires at least one work-week; not evaluable in a single session |

## Decisions pending check 6

If check 6 passes: adopt `memory-wiki` as template default in `isolated` mode. Write `install.sh` and routing-row updates. Update `DOCK.md` Section D.

If check 6 fails: do not adopt. Structured-claim overhead doesn't earn its keep; stay markdown-only.

## Pre-adoption requirements (checks 1–5 findings)

**Check 2 — DOCK wrapper required.** `wiki_search` does not filter by `privacyTier`. If adopted, the `domain-memory` plugin must wrap `wiki_search` calls and suppress results where `privacyTier` is `local-private` or `confirm-before-use` before returning to the host. This wrapper is the same outbound-boundary layer described in ADR 0005; the DOCK category "Memory recall — raw files and index entries denied" covers it. Document the wrapper in the plugin and in the routing row that loads `memory-wiki`.

**Check 4 — Ollama discrepancy.** OC's `memory-wiki` uses its built-in local embedding provider (HuggingFace GGUF via `local` transport) rather than Ollama. ADR 0007 specifies Ollama as the template default. Before adoption, confirm whether `memory-wiki` can be configured to use the Ollama embedding provider, or update ADR 0007 to accept OC's built-in local provider as an equivalent. Either resolution is acceptable; the key constraint (no cloud auto-detection) is satisfied by both.

**Check 1 — obsidian-cli vault registration.** The wiki vault must be registered in the Obsidian app for `obsidian-cli search` to function. Add a post-install step to `install.sh` (or the post-install checklist) that prompts the worker to open the wiki vault in Obsidian at least once. Not blocking adoption; blocking the obsidian-skills synergy.
