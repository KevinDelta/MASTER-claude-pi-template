# TOOLS.md - [Project Name]

<!-- OpenClaw workspace/project tool policy.
     Keep this aligned with AGENTS.md Out of Bounds and any channel-specific allowlists.
     This is a declaration for the agent and framework operator; enforcement belongs in
     OpenClaw config, plugin policy, or host permissions. -->

---

## Default Policy

| Capability | Policy | Notes |
|------------|--------|-------|
| Read project files | allow | Stay inside this project root unless explicitly routed elsewhere |
| Write/edit project files | ask | Confirm when changing deliverables, context, or source files |
| Shell commands | ask | Prefer read-only inspection first |
| Network calls | ask | Confirm destination and purpose |
| Secrets/env files | deny | Never read or print `.env`, auth files, or token-bearing config |
| Memory tools | allow | Use domain-memory tools according to routing rows |
| Stripe commerce tools | ask | Reads are allowed only for authorized project scope; money-moving actions require worker approval per domain `DOCK.md` |

---

## Project Overrides

- [Project-specific tool policy]
- [Project-specific host/channel restriction]
