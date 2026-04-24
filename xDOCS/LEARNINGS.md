# What We Learned

**Pi's schema is unforgiving silently.** Wrong types for `defaultThinkingLevel` (object vs string) and `skills` (object vs array) fail without error messages — the config just doesn't apply. Always verify against actual pi source.

**The routing table IS the session discipline.** Without it, agents guess what to load. With it, every session starts from identical complete context.

**Context files and memory serve different time horizons.** `context/` = stable project facts. `workspaces/CONTEXT.md` = current work state. `memory/` = accumulated knowledge. None substitutes for another.

**Auto-capture reduces manual overhead significantly.** When the agentmemory bridge captures tool call observations automatically, the session-end memory-write task shrinks to decisions/lessons only — not a full narrative log.

**Global/project separation is load-bearing.** Without it, org standards drift into individual projects and diverge. Update once, every project inherits.

**Authoring quality is the actual product.** The template is infrastructure. Specific, accurate content files produce specific, useful agents.

**Pi does not auto-discover domain config.** `PI_DOMAIN_NAME` and `~/.pi/active-domain` are not magic — pi doesn't read them to load domain AGENTS.md or extensions. The v3 solution: `install.sh` bakes global + domain content into a single `~/.pi/agent/AGENTS.md` that pi reads natively. The alias now only needs `-e <extension-path>` for the memory-db extension. `domain/.pi/settings.json` is reference/documentation only.

**NODE_PATH is required for global npm packages.** Pi's module resolution doesn't include the npm global path by default. `export NODE_PATH="$(npm root -g)"` in the shell RC is required for extensions that import globally installed packages.
