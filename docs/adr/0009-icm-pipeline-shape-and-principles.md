# Adopt Interpretable Context Methodology: the five principles and the L0–L4 layer model

MASTER adopts the design language of the Interpretable Context Methodology (ICM)¹ — its five operating principles and its five-layer (L0–L4) context model — as the conceptual frame for how context is structured and loaded across the template. This ADR records the principles and the layer *roles*; the concrete folder mechanics that implement them (Staged Areas, stage contracts) live in **ADR 0010**. MASTER borrows ICM's shape and vocabulary, not its runtime: there is no multi-turn pipeline driver, because OpenClaw routing and heartbeat already own orchestration.

¹ Van Clief & McDermott, *Interpretable Context Methodology: Folder Structure as Agent Architecture*, arXiv:2603.16021v2.

## The five operating principles

Lifted to the top of `xDOCS/BLUEPRINT.md` and cited in ADRs and reviews as named anchors for structural decisions. ICM's order is preserved.

1. **One stage, one job.** Each unit of work handles one step and writes its own output. (ICM §3.1; McIlroy's Unix rule, Parnas information-hiding.)
2. **Plain text as the interface.** Markdown and JSON are the substrate — any tool or human with a text editor can participate. MASTER names this principle *because it has surfaces where it bites*: `memory.db` and the sqlite-vec index (ADR 0007, 0008) and Stripe commerce state are not plain text. The principle is what makes **files-as-truth (ADR 0007)** principled rather than arbitrary — workspace markdown is canonical, the index is a regenerable artifact. (ICM §3.1; Kernighan & Pike.)
3. **Layered context loading.** Each stage loads only the context it needs — prevention, not compression. (ICM §3.1; "lost in the middle," Liu et al.)
4. **Every output is an edit surface.** Intermediate artifacts are human-readable files a person can inspect and edit before downstream steps consume them. (ICM §3.1; Horvitz mixed-initiative, Shneiderman direct manipulation.)
5. **Configure the factory, not the product.** Reusable reference material (the factory) is kept separate from per-run working artifacts (the product); a workspace is configured once and produces many deliverables. (ICM §3.1; continuous delivery.)

## The L0–L4 layer model (MASTER mapping)

ICM Fig. 1 defines a five-layer context hierarchy. MASTER adopts the layer *roles* and the L0–L4 vocabulary. The physical files differ from ICM in exactly one place — L1 — and that divergence is deliberate.

| Layer | Role ("question it answers") | ICM file | MASTER file |
|-------|------------------------------|----------|-------------|
| **L0** | "Who am I / where am I?" — identity | `CLAUDE.md` | `SOUL.md` + global `AGENTS.md` "Who You Are" |
| **L1** | "Where do I go?" — task routing | `CONTEXT.md` | **`AGENTS.md` routing table** |
| **L2** | "What do I do?" — the contract | stage `CONTEXT.md` | area / stage `CONTEXT.md` |
| **L3** | "What rules apply?" — factory | `references/`, `_config/` | `[ref]` files (see narrowest-scope rule) |
| **L4** | "What am I working with?" — product | `output/` | `[work]` files |

**The L1 divergence is the load-bearing point.** In ICM, task routing lives in `CONTEXT.md`. In MASTER it lives in `AGENTS.md`, because: (a) OpenClaw reads `AGENTS.md` natively as the router; (b) `global/AGENTS.md` already defines the split — *"OpenClaw routing chooses the agent/workspace/session; AGENTS.md routing chooses how work is performed after the message arrives"*; and (c) routing-table-first is the template's identity (ADR 0004). ICM's L1 is a *role*, not a filename mandate. MASTER fills that role with `AGENTS.md`, which frees `CONTEXT.md` to serve L2 (the area/stage contract) at depth and the repo glossary at root — different subtrees, no collision. This is also why the previously-proposed `CONTEXT.md → GLOSSARY.md` rename is unnecessary and is not done.

## Factory vs product: `[ref]`/`[work]` tags and the narrowest-scope rule

Direct applications of principles 3 and 5.

- **Routing-row tags.** A `Read:` cell may suffix a file with `[ref]` (L3 factory — internalize as constraint) or `[work]` (L4 product — process as input). Documentation by default. The intended `scripts/lint-skills.mjs` enforcement — producer-skills never write to `[ref]` paths, inbox distillation never treats `[work]` files as durable rule — is deferred (ADR 0010 defers the workspace-pattern linter until real Staged Areas exist).
- **Narrowest-scope rule.** Reference material lives at the narrowest tier where it applies: stage → `NN_stage/references/`; project → `base/context/`; domain → `domain/context/`; global → `global/`. Prevents the L3 duplication antipattern (a brand-voice file copied into every delivery stage). Migration is a scope audit, not a wholesale relocation.

## Considered Options

- **Adopt the full ICM runtime (a `pipeline-skill` flavor).** Rejected. A multi-turn driver that walks numbered folders and pauses between stages inverts OpenClaw's single-turn routing + heartbeat contract and stacks a third skill flavor on modifier and producer. The wins ICM cites — design language, edit-gate discipline, the U-shape insight — require the *shape and vocabulary*, not the runtime.
- **Name only four principles (drop "plain text as the interface").** Rejected — this reverses the earlier draft. Its rationale ("every file is already markdown; listing it is ceremony") is false for this repo: MASTER has `memory.db`, a sqlite-vec index, and Stripe state. The principle constrains a real choice (which layer is canonical) and is the foundation of ADR 0007. It earns naming *more* in MASTER than in ICM.
- **Adopt ICM's filenames literally (routing in `CONTEXT.md` at L1).** Rejected for now. It supersedes ADR 0004, re-plumbs `install.sh`'s routing-first `AGENTS.md` build, rewrites the routing-table-first brand, and has no known OpenClaw support for routing from `CONTEXT.md`. ICM's L1 is a role MASTER already fills with `AGENTS.md`. If pursued, it belongs in its own ADR, not as a side effect of adopting the layer model.
- **Bundle the persona-file and decision-lifecycle decisions here (as the earlier draft did).** Rejected. SOUL.md required sections and operating-decision promotion are orthogonal to ICM; bundling them violates principle 1 ("one stage, one job") at the ADR level. Split to **ADR 0011** and **ADR 0012**.

## Consequences

- The five principles live at the top of `xDOCS/BLUEPRINT.md` as named anchors cited in future ADRs and reviews.
- `[ref]`/`[work]` tags and the narrowest-scope rule govern factory/product placement; `scripts/lint-skills.mjs` enforcement is deferred (see ADR 0010), documentation-only until then.
- The L0–L4 vocabulary is documented in `CONTEXT.md` and used as shared language in reviews ("per L4, this stage is treating a working artifact as a rule").
- **What is NOT introduced:** no `pipeline-skill` runtime flavor; no `CONTEXT.md → GLOSSARY.md` rename; no relocation of routing out of `AGENTS.md`.
- The concrete folder mechanics that implement these principles — Staged Areas, the stage contract, handoffs — are specified in **ADR 0010**.
