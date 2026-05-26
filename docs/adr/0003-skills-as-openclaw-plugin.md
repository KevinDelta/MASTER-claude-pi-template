# Skills are shipped and managed by an OpenClaw plugin

The skill library moves out of loose top-level `skills/` and `domain/skills/` directories and into a dedicated `domain-skills` OpenClaw plugin. The plugin owns discovery (`list_skills`), reading (`read_skill`), vendoring (`install_skill` wrapping the `openskills` CLI), and removal (`remove_skill`). At runtime OpenClaw's `skills.load.extraDirs` is configured with four entries in last-wins precedence order: `plugin/core` → `plugin/domains/<name>` → `vendor` → `user`. Routing rows remain the single load mechanism — the agent does not browse `list_skills` to pick skills on its own.

## Considered Options

- **Keep loose top-level `skills/` and `domain/skills/` dirs.** Rejected because it duplicates dir layout with no runtime distinction (install.sh already merged them into one workspace dir), creates two seed sources to maintain, and leaves no managed entry point for third-party vendoring.
- **Adopt `openskills` as both package manager and loader.** Rejected. The `<available_skills>` XML block model relies on agent-discretion discovery, which violates the routing-table-first contract declared in `AGENTS.md` ("Never bypass the routing table"). Adopting it as loader would dilute the guarantee that routing decides what loads. Borrowed only as a package-manager — `install_skill` calls `openskills install ... --no-sync` so AGENTS.md is never mutated by the tool.
- **Multiple plugins, one per tier (`skills-core` + `skills-<domain>`).** Rejected because it cuts against the goal of "one place," forces install.sh to coordinate multiple plugin installs, and would inevitably be released atomically anyway — meaning the separation buys nothing but coordination overhead.
- **One plugin, flat `skills/` dir (no internal tiers).** Rejected because a domain-specific skill (`distill-inbox`, `goals-resolver`) would appear in `list_skills` for every install regardless of relevance. Tier-as-subdir lets `extraDirs` encode visibility without per-skill frontmatter filtering.
- **Promotion tool for user→plugin lifecycle.** Rejected as premature. Mixed authoring (workspace user dir for experiments, plugin source for shipped skills, `mv` + `git commit` to promote) is honest about what's actually happening. A heartbeat task drives the curation review. Build the tool when proliferation justifies it.
- **Keep the "Routed Skills" inventory table in `domain/AGENTS.md`.** Rejected because it duplicates the `description:` frontmatter on every skill, drifts as skills are added/renamed/removed, and reintroduces the machine-mutated-AGENTS.md pattern (option (b)) we rejected for openskills. `list_skills` is the discovery surface; the routing rows themselves are the curated subset declaration.

## Consequences

- The plugin lives at `domain/openclaw/plugins/domain-skills/` matching the existing `domain-memory`/`domain-commerce` pattern. install.sh installs it as `~/.openclaw/plugins/domain-skills-<DOMAIN>/`.
- `skills/` and `domain/skills/` at the repo root are deleted; their contents move into `domain/openclaw/plugins/domain-skills/core/` and `.../domains/<DOMAIN_NAME>/` respectively.
- `list_skills` is removed from `domain-memory` (the function and its tool registration in `index.ts`) and reimplemented in the new plugin. `domain-memory` returns to owning only memory.
- install.sh writes `skills.load.extraDirs` as the four-entry array in last-wins order. The single-entry config at `install.sh:482` is replaced.
- A skill's authoring contract stays minimal: required `name` + `description`, optional `Template:` (per ADR-0001). The plugin's build step lints `name === basename(file, ".md")` and rejects unknown frontmatter keys to keep the contract closed.
- The `domain/AGENTS.md` "Routed Skills" section is replaced by a two-sentence discoverability paragraph pointing at `list_skills` and the plugin source dirs.
- Two implicit categories of skill remain (per ADR-0001's producer/modifier convention) — presence of `Template:` is the only signal; no typed `kind:` field.
- The vendor dir (`~/.openclaw/agents/<domain>/skills/vendor/`) is *only* written by `install_skill`. That gives `list_skills` honest provenance (`source: vendor` ⇒ "installed via openskills"). The user dir is for hand-authored skills and overrides; the plugin dirs are read-only from the workspace's perspective (changes happen in the plugin source and propagate via plugin update).
- `install_skill` is approval-gated through the existing DOCK-pattern gate model; `remove_skill` is similarly gated. No source allowlist initially — the approval prompt carries the source URL.
- Cross-template reuse of the skill library is not supported by this ADR; if it becomes a real requirement, the plugin can be extracted to a separate repo/npm package without changing the runtime model.
