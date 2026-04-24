# Key Design Decisions

| Decision | What | Why |
| ---------- | ------ | ----- |
| YAML frontmatter required on skills | `name` + `description` fields | Pi can't discover or describe skills without them |
| `defaultThinkingLevel` is a string | `"medium"` not `{ "level": "medium" }` | Pi's actual type; object caused silent parse failure |
| `skills`/`extensions` are arrays | `["skills/*.md"]` not `{ "paths": [...] }` | Same issue — real pi schema takes flat arrays |
| ExtensionAPI two-param handlers | `async (_event, ctx) =>` | Pi's real signature; one-param would receive event, not ctx |
| agentmemory interaction via HTTP only | Never touch iii-sdk directly | iii-sdk is proprietary Anthropic infrastructure; MCP/HTTP is the stable interface |
| Binary store is gitignored | `memory/.agentmemory/` excluded | Regenerable from observations; MEMORY.md is the canonical committed record |
| Bridge checks health before acting | `available` flag gated | Ensures pi-memory continues uninterrupted if agentmemory is down |
| CONTEXT.md has Functions + Workflow | Stable process sections added | Gives the agent action vocabulary and sequencing without duplicating routing tables |
| No routing tables in CONTEXT.md | Decision: not added | Wrong time horizon — routing is architecture, CONTEXT.md is volatile state |
| Global/project in one AGENTS.md | Both sections, clear delineation | Full picture in one template file; split for deploy |
| Custom skills always | Write our own, draw from community for conventions | Skills must match org-specific standards and vocabulary |
