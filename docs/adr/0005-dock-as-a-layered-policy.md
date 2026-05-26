# DOCK.md is a Policy Declaration, Enforced by Three Layers

DOCK.md is the durable export policy contract for the domain agent. It declares what may be exposed to hosts and channels, and what is denied by default. It does not enumerate specific plugin tools or specify per-boundary enforcement details — those belong in the implementation layers that enforce the policy.

Enforcement is three-layer:

| Layer | Enforces |
|-------|---------|
| Plugin schemas | Tools only expose what their schema allows; raw export tools are denied by default |
| Routing rows | `AGENTS.md` out-of-bounds row checks this policy at think-time before the agent responds |
| Gateway config | Auth, channel allowlists, and session policy; the durable target for access-boundary enforcement |

This model was chosen over a flat per-boundary enforcement table because each layer changes independently. A plugin rewrite does not require a DOCK.md edit; a Gateway config change does not require a routing table edit. Coupling policy to implementation detail caused DOCK.md to drift with every plugin revision.

The access surface is declared as categories (domain identity, memory recall, project status, skill discovery, structured writes, raw data export, commerce operations), not as tool names. Plugin tools implement these categories; DOCK.md does not track them.

The portability contract follows the same principle: DOCK.md declares that workspace markdown is the canonical record and the OC-native index is regenerable. It does not specify index paths or plugin internals.
