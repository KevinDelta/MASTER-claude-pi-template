# BLUEPRINT - MASTER OpenClaw Agent Template

The authoritative reference for how this system works. Read this before modifying anything structural.

---

## What This Is

A template for building portable, domain-scoped knowledge worker agents that run on OpenClaw. The framework is still agent-agnostic at the spec level: `AGENTS.md`, `SOUL.md`, `MEMORY.md`, `HEARTBEAT.md`, `DOCK.md`, context files, skills, and the memory schema define the durable product. OpenClaw is the default runtime/control plane.

OpenClaw handles the runtime surfaces that should not be custom framework code:

- Gateway and auth
- Messaging/channel access
- Agent workspaces and identities
- Multi-agent routing and bindings
- Heartbeat/proactive turns
- Plugin and skill loading
- Local/remote agent invocation

The framework keeps the differentiated pieces:

- Routing-table-first cognition
- Domain/project context architecture
- Persona and dock policy
- Local SQLite/sqlite-vec memory
- Domain-specific skills and operating methods

---

## Operating Principles

MASTER inherits five design principles from the Interpretable Context Methodology (ICM).¹ They are the discipline for structural decisions: every ADR and review cites them by name as anchors ("per principle 4, this change erases the edit gate"). When a structural choice is in tension with one of these, that tension must be named and resolved in an ADR — not papered over.

1. **One stage, one job.** Each unit of work handles one step and writes its own output. A stage that fetches data does not also filter it; a stage that filters does not also format the final deliverable.
2. **Plain text as the interface.** Markdown and JSON are the substrate — any tool or human with a text editor can participate. This is the rule that makes **files-as-truth (ADR 0007)** principled rather than arbitrary, and it bites precisely where MASTER is *not* plain text: `memory.db` and the sqlite-vec index are regenerable artifacts, not co-equal truth; commerce state lives behind explicit gates. Workspace markdown is canonical.
3. **Layered context loading.** Each stage loads only the context it needs — prevention of the "lost in the middle" failure, not after-the-fact compression. Realised as the L0–L4 layer model and the `[ref]`/`[work]` distinction.
4. **Every output is an edit surface.** Intermediate artifacts are human-readable files a person can inspect and edit before downstream steps consume them. The `output/` folder of a stage, the inbox distillation surface, and the two-turn commerce approval are all edit gates.
5. **Configure the factory, not the product.** Reusable reference material (the factory — L3 `[ref]`) is kept separate from per-run working artifacts (the product — L4 `[work]`). A workspace is configured once and produces many deliverables. Governed by the narrowest-scope rule.

See **ADR 0009** for the full rationale (including why all five are named, not four) and the L0–L4 layer model these principles rest on, and **ADR 0010** for the Staged Area pattern that implements them.

¹ Van Clief & McDermott, *Interpretable Context Methodology: Folder Structure as Agent Architecture*, arXiv:2603.16021v2.

---

## Core Files

| File | What It Is | Who Reads It |
|------|------------|--------------|
| `AGENTS.md` | Operating manual and routing table | OpenClaw agent before work |
| `SOUL.md` | Persona/identity | OpenClaw agent and identity setup |
| `HEARTBEAT.md` | Recurring work contract | OpenClaw heartbeat turns |
| `MEMORY.md` | Human-readable memory index | Agent and worker |
| `DOCK.md` | Host/channel export policy | Agent, worker, plugin policy |
| `TOOLS.md` | Project tool policy declaration | Project agent/worker |

Routing tables are the primary work interface. A task that does not resolve through a routing row is underspecified.

OpenClaw native routing and framework work routing are separate:

| Layer | Owner | Decides |
|-------|-------|---------|
| Native routing | OpenClaw `agents`, `bindings`, channels, sessions, heartbeat target | Which agent/workspace/session receives a message |
| Work routing | `AGENTS.md` tables | What the selected agent reads, where it works, and which skills/tools it uses |

Do not encode channel/account/peer bindings in `AGENTS.md`. That belongs in OpenClaw config.

---

## Installed Layout

```
~/.openclaw/
├── openclaw.json                 # OpenClaw Gateway/agent/channel/plugin config
├── active-domain                 # last installed/selected domain slug
├── plugins/
│   ├── domain-memory-<domain>/   # local OpenClaw plugin copy (slug-suffixed)
│   └── domain-skills-<domain>/
├── workspace/                    # template-owned content lives here
│   ├── AGENTS.md                 # global + domain combined by install.sh
│   ├── SOUL.md                   # OpenClaw-owned; worker fills (see docs/agents/persona.md)
│   ├── HEARTBEAT.md              # OpenClaw-owned; worker fills (see docs/agents/heartbeat-tasks.md)
│   ├── USER.md                   # OpenClaw-owned; worker fills
│   ├── IDENTITY.md               # OpenClaw-owned
│   ├── MEMORY.md                 # template-owned
│   ├── DOCK.md                   # template-owned
│   ├── memory.db                 # created by domain-memory tools
│   ├── openclaw.domain.json5     # reference config snapshot
│   ├── context/
│   └── skills/
└── agents/                       # OpenClaw's per-agent state — NEVER our content
    └── main/                     # OC manages this directory
```

Project repos still use the `base/` template:

```
<project-root>/
├── AGENTS.md
├── TOOLS.md
├── SOUL.md                       # optional project override
├── openclaw/
│   ├── .env.example
│   └── project.config.json5
├── context/
└── areas/
```

---

## Routing Table Contract

Every entrypoint must resolve through `AGENTS.md` before work begins:

- direct `openclaw agent --agent <domain> --message ...` turns
- messaging/channel turns
- heartbeat turns
- project-scoped turns
- harness development work

Layering:

1. `global/AGENTS.md` defines org-wide standards.
2. `domain/AGENTS.md` defines domain vocabulary, methods, routing, heartbeat rows, and domain constraints.
3. Project `AGENTS.md` defines engagement-specific rows and overrides.

Composition rules:

- Domain rows apply unless a project row overrides the same task key.
- Project rows should only override real project-specific behavior.
- Heartbeat work is routed through the `Heartbeat`, `Domain status`, `Goal review`, and `Session end` rows.
- Channel routes are not shortcuts; they only select the agent/session. The agent still resolves the task through the routing table.
- Skill discovery belongs to OpenClaw config; skill use belongs to routing rows.

---

## OpenClaw Runtime Mapping

| Framework Need | OpenClaw Native Surface | Template Artifact |
|----------------|-------------------------|-------------------|
| Domain agent | `openclaw agents add <id> --workspace <path>` | `install.sh` |
| Persona | agent identity + `SOUL.md` | `SOUL.md` |
| Remote/mobile access | Gateway + channels | `~/.openclaw/openclaw.json` |
| Recurring work | heartbeat | `HEARTBEAT.md` |
| Skills | `skills.load.extraDirs` | `skills/*.md` |
| Custom memory tools | plugin SDK | `domain/openclaw/plugins/domain-memory/` |
| Optional commerce tools | plugin SDK + Stripe APIs | `domain/openclaw/plugins/domain-commerce/` |
| Export policy | plugin tools + gateway/channel auth | `DOCK.md` |
| Project tool policy | host/OpenClaw permissions + instruction | `TOOLS.md` |

---

## Memory Architecture

Memory is **files-as-truth**. Workspace markdown files are the canonical record; the OC-native search index is a regenerable artifact.

| Layer | Location | Portability |
|-------|----------|-------------|
| Workspace markdown | `MEMORY.md`, `memory/*.md` | Must carry — canonical record |
| OC-native search index | `~/.openclaw/memory/<agent>.sqlite` | Regenerable — do not carry |

**Ownership:** OpenClaw native memory owns the index. The `domain-memory` plugin is a thin wrapper — it applies redaction, bounding, and project-filter on top of OC's `memory search` command. It does not own a separate database.

**Portability:** moving a domain means copying workspace markdown and plugin source/config, then running `install.sh`. The index rebuilds on first use.

**Unpromoted observations** — notes written to the index but not yet promoted to a `memory/*.md` file — are ephemeral by design. The session-end routing row is the promotion checkpoint.

**Embeddings:** generated locally by default (Ollama). No cloud provider is auto-detected or activated. Falls back to FTS-only search when Ollama is absent.

Plugin:

```
domain/openclaw/plugins/domain-memory/
```

The plugin exposes access categories (memory recall, project status, domain identity) as defined in `DOCK.md` Section D. It does not expose raw index entries, file contents, or embedding data. See `DOCK.md` for the full access category table and default postures.

---

## Heartbeat

`watches.yaml` is deleted. launchd/systemd scheduler templates are deleted. All recurring/proactive work goes through OpenClaw heartbeat and the native `tasks:` block in `HEARTBEAT.md`.

Default heartbeat prompt:

```
Read HEARTBEAT.md if it exists. OpenClaw includes only due tasks from its native tasks block; follow those task prompts strictly. Resolve every recurring task through the AGENTS.md routing table before acting. If nothing needs attention, reply HEARTBEAT_OK.
```

Former watch concepts map as follows:

| Former Watch | Heartbeat Mapping |
|--------------|-------------------|
| morning-plan | `tasks: morning-plan` |
| weekly-sync | `tasks: weekly-sync` |
| stale-project-check | `tasks: stale-project-check` |
| goal-referenced watches | `tasks: goal-review` |
| JSON-mode watches | `observation_write(kind: "log", meta: {...})` |

Heartbeat is interval/condition-based, not cron-shaped. OpenClaw decides which named tasks are due; each task prompt then checks idempotence conditions such as "no weekly sync observation exists for this week." This removes an OS-specific process layer and keeps recurring work inside the same agent workspace, policy, tools, and routing contract.

---

## Dock Policy

`DOCK.md` replaces `PI_DOCK.md`.

`DOCK.md` is a policy declaration — it states what the agent may and may not expose. It does not enumerate plugin tools or specify per-boundary enforcement details. Enforcement is three-layer:

| Layer | Enforces |
|-------|---------|
| Plugin schemas | Tools only expose what their schema allows; raw export denied by default |
| Routing rows | `AGENTS.md` out-of-bounds row checks DOCK.md at think-time |
| Gateway config | Auth, channel allowlists, and session policy |

The default posture declared in DOCK.md:

- answer domain and memory questions through synthesized summaries,
- expose skill names/descriptions, not file contents,
- expose aggregate project status, not raw logs,
- deny raw index entries and unpromoted observations by default,
- require worker approval for requests outside the allowlist.

Portability: the worker owns workspace markdown and plugin source/config. The OC-native search index is regenerable and is not part of the portability contract. See ADR 0005 for the full decision record.

---

## Commerce / Stripe

Commerce is an optional framework capability. Stripe is the receivables and
payment-state rail; it is not a general autonomous spending rail.

Detailed implementation notes live in `xDOCS/STRIPE_WORKFLOW.md`.

Core flow:

```
AGENTS.md routing row
-> DOCK.md commerce policy
-> domain-commerce plugin
-> Stripe Checkout, Payment Links, Invoices, or payment status API
-> webhook/payment event
-> bounded event summary written to memory (promoted to markdown if durable)
```

Target use cases:

- Consulting or freelance invoices for work delivered to a client
- Ad hoc service payment links
- Reimbursable supplies or expenses billed back to a client
- Payment-event operations such as overdue invoice review, failed payment follow-up, and revenue/status summaries

The production path should be a narrow OpenClaw `domain-commerce` plugin with
explicit approval gates. Stripe MCP is useful for exploration and admin work,
but it is too broad to be the default production surface unless a worker
explicitly approves that mode.

Install the optional plugin with `install.sh --enable-commerce`. It pins Stripe
API requests to `2026-02-25.clover` until a worker deliberately upgrades the
template after checking Stripe's current version guidance.

Proposed commerce tools:

| Tool | Purpose | Default Approval |
|------|---------|------------------|
| `commerce_catalog_list` | Show approved services, supplies, rates, Stripe price IDs | Not required |
| `commerce_policy` | Show current commerce policy and key mode without secrets | Not required |
| `commerce_invoice_draft` | Draft invoice from project/client context | Not required |
| `commerce_invoice_send` | Finalize/send Stripe invoice | Required |
| `commerce_payment_link_create` | Create payment link for service or reimbursable item | Required unless explicitly allowlisted |
| `commerce_checkout_create` | Create one-time Checkout Session | Required |
| `commerce_payment_status` | Check invoice/session/payment state | Not required |
| `commerce_event_list` | Summarize recent payment events | Not required, no raw export |
| `commerce_refund_draft` | Draft refund action | Not required |
| `commerce_refund_execute` | Execute refund | Always required |

Conceptual routing rows:

| Task Type | Purpose |
|-----------|---------|
| **Commerce / invoice** | Draft, review, and send invoices |
| **Commerce / payment link** | Create approved ad hoc payment links |
| **Commerce / expense rebill** | Record reimbursable items and add them to an invoice or payment link |
| **Commerce / payment status** | Summarize paid, open, failed, and overdue payment state |
| **Commerce / refund** | Draft or execute refunds with explicit approval |

Constraints and tradeoffs:

- Use restricted Stripe API keys. Live broad secret keys are out of bounds for agent tools.
- Hosted Checkout, Payment Links, and Invoices are preferred because the framework should not handle card data.
- Payment completion must be verified through Stripe webhooks or Stripe API status checks, not success URLs or agent memory alone.
- Stripe can bill a client for supplies, but it does not buy supplies from third-party vendors. Actual purchasing requires a future procurement/card/vendor integration.
- Financial actions create external side effects, so approval gates are stricter than memory/query tools.
- Payment event summaries can enter `memory.db`; raw Stripe event payloads, customer PII, tax details, and full financial records are not exported by default.
- Machine payments/x402 and instant agent checkout are future tracks, not v1 assumptions.

---

## Install Flow

```bash
./install.sh --domain <name> --persona <persona-name>
```

Wizard-generated bundles use the intake-driven form:

```bash
./install.sh --intake-json master.json --project-dir <project-root>
```

The installer:

1. checks Node/OpenClaw,
2. creates `~/.openclaw/workspace/`,
3. deploys domain files,
4. builds combined `AGENTS.md`,
5. applies intake through the canonical framework renderer when `--intake-json` is provided,
6. links the domain-memory plugin,
7. registers the OpenClaw agent,
8. configures heartbeat defaults,
9. optionally onboards the Gateway daemon,
10. optionally installs/pulls Ollama embeddings,
11. creates a persona alias,
12. optionally creates/fills the project repo from `base/`.

The HTML wizard owns intake, not provisioning. Its bundle contains
`master.json`, a thin `setup-client.sh`, onboarding notes, and a checklist.
`setup-client.sh` calls `install.sh --intake-json ...`; it must not overwrite
the installed domain `AGENTS.md` or bypass installer composition.

---

## First-Principles Summary

| Step | Action |
|------|--------|
| Requirements less dumb | The durable spec is routing/context/memory, not the old Pi runtime. |
| Delete | `watches.yaml`, scheduler templates, `.pi` settings, Pi MCP server, Pi extension runtime. |
| Simplify | OpenClaw owns gateway, auth, channels, identity, heartbeat, and agent routing. |
| Accelerate | Heartbeat and plugin tools run inside the same workspace/control plane. |
| Automate | Recurring work happens through OpenClaw heartbeat after the routing contract is explicit. |
