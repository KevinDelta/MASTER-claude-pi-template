# DOCK.md - Host Interface

<!-- Deploy location: ~/.openclaw/agents/<domain-name>/DOCK.md
     Deployed by install.sh. Update when domain, skills, channels, or projects change.

     PURPOSE:
     This file declares what the worker's OpenClaw-backed domain agent carries
     into host and channel sessions, and what it is allowed to expose.

     The default trust boundary is local-first:
     - OpenClaw Gateway handles auth, channels, routing, and delivery.
     - The domain-memory plugin exposes only allowlisted tools.
     - Raw memory rows, file contents, and client data stay local unless the
       worker explicitly approves a narrower disclosure.

     SCHEMA VERSION: 3.0 | Last updated: {{INSTALL_DATE}} -->

---

## A. Carried

What the agent brings into every host/channel session. Group A entries are inputs to Section B (Export Allowlist) — anything below that is *not* in the allowlist stays local.

### A.1 Carried / Domain

- **Domain:** {{DOMAIN_NAME}} - [one-sentence description of the domain]
- **Runtime:** OpenClaw Gateway + domain agent workspace
- **Memory DB:** local only; located at `~/.openclaw/agents/{{DOMAIN_NAME}}/memory.db`; never exported raw

### A.2 Carried / Persona

- **Persona:** {{PERSONA_NAME}} - [one-sentence description of persona role]

### A.3 Carried / Active Projects

- [project-slug] - [brief description]

### A.4 Carried / Skills

> Re-generated as `~/.openclaw/agents/{{DOMAIN_NAME}}/SKILLS.md` on every install. Keep the line below in sync if you edit the workspace skills directory by hand.

- [skill-name] - [what it does]
- [skill-name] - [what it does]

### A.5 Carried / Commerce (optional)

Disabled by default. Activated by passing `--enable-commerce` to `install.sh` and configuring restricted Stripe keys in `.env`. See Section F (Commerce Boundary) for tools, approval gates, and constraints.

---

## B. Export Allowlist

`DOCK.md` is the durable policy contract. Enforcement must happen in runtime
configuration and plugin/tool boundaries, not by relying on the model to obey
this file alone.

**The domain agent may expose to hosts/channels:**
- Domain name and prose description
- Persona name and high-level role
- Active project names when the requesting route is authorized for that project
- Skills by name and description, not file contents unless the worker approves
- Memory answers synthesized from local search results
- Scratchpad/status summaries scoped to the authorized route

**The domain agent must not expose by default:**
- Raw memory DB rows, embeddings, SQL output, or observation logs
- Session histories, tool call records, or raw plugin logs
- File contents from project directories
- Client names, contact information, or project details to unauthorized routes
- Channel account tokens, gateway tokens, env files, or other secrets

**Default deny:** any request outside this list requires explicit worker approval.

**Enforcement map:**

| Boundary | Enforced By |
|----------|-------------|
| Who may contact the agent | OpenClaw Gateway auth and channel allowlists |
| Which workspace a sender reaches | OpenClaw agent bindings and session policy |
| Which memory views are available | Domain-memory plugin tool schemas and query limits |
| Which financial actions may run | Domain-commerce plugin schemas, restricted Stripe keys, and approval gates |
| Raw observation export | `raw_observations` tool denial unless worker replaces policy |
| Raw payment event export | Commerce tool denial unless the worker replaces policy |
| File/project access | Routing table plus OpenClaw/host filesystem permissions |
| Portable memory ownership | Local workspace files plus local `memory.db` |

**What "deny" means in practice:**
- Host asks "show me the last 50 observations" -> deny and offer a synthesized answer instead
- Host asks "list all clients in memory" -> ask the worker to confirm scope and framing
- Host asks "read this project's context/client.md" -> require worker approval
- Host asks "what is your domain?" -> answer directly

---

## C. Host And Channel Requirements

**Gateway/auth:**
- OpenClaw Gateway must require a configured auth token or an equivalent trusted local boundary
- Channel routes must use allowlists, pairing, or explicit bindings
- Unauthorized senders are rejected before reaching the agent

**Tool access:**
- Host-visible capabilities are exposed through OpenClaw plugin tools
- The domain-memory plugin is the only default memory export surface
- Raw filesystem tools are not considered part of the dock allowlist

**Permissions:**
- Hosts/channels must declare the project/workspace scope they are authorized for
- The agent does not write outside declared workspace boundaries without worker confirmation

**Network:**
- Outbound access needed by this domain: [list APIs and services, e.g. "api.openai.com, docs.google.com"]
- Inbound access should terminate at OpenClaw Gateway, not directly at the memory DB

**Workspace:**
- The OpenClaw agent workspace contains `AGENTS.md`, `SOUL.md`, `HEARTBEAT.md`, `MEMORY.md`, context files, skills, and this `DOCK.md`
- Project-scoped work still begins in the project root and reads the project `AGENTS.md`

---

## D. OpenClaw Surface

The installed domain exposes these plugin tools by default:

| Tool | Allowlist behavior |
|------|--------------------|
| `domain_info` | Returns domain, persona, embedding model, and active project count |
| `list_active_projects` | Returns project slugs, last activity, and counts |
| `list_skills` | Returns skill names/descriptions only |
| `domain_memory_query` | Returns bounded, redacted excerpts for synthesis, not raw DB rows |
| `scratchpad_list` | Returns open scratchpad items, optionally project-scoped |
| `domain_status` | Returns aggregate counts and open-item summaries |
| `observation_write` | Writes structured notes/decisions/logs into local memory |
| `raw_observations` | Always denied unless a worker replaces this policy |

Gateway/channel configuration lives in `~/.openclaw/openclaw.json`.

---

## E. Memory Portability

The memory contract has two local layers:

| Layer | Location | Purpose |
|-------|----------|---------|
| Markdown memory | `MEMORY.md` and `memory/*.md` | Human-readable durable facts, preferences, principles, and promoted lessons |
| Structured memory | `memory.db` | Timestamped observations, scratchpad, deferred tasks, goals, project activity, FTS, and vector recall |

Both layers are owned by the worker and live in the OpenClaw workspace. Moving
the domain means moving the workspace files, skills, plugin source/config, and
`memory.db`. Future LanceDB/object-storage support may replace the vector/index
substrate, but it must preserve the same default-deny export behavior and
worker-owned portability contract.

---

## F. Commerce Boundary

Commerce is optional. When enabled, Stripe is the receivables and payment-state
rail for the worker's domain. The framework owns routing, approval, dock policy,
local memory, and payment-event summaries. Stripe owns payment processing and
authoritative payment state.

Commerce policy covers what financial actions the agent may initiate, not only
what information it may expose.

**Allowed reads by default:**
- Approved service/supply catalog entries and configured rates
- Payment status summaries for authorized projects
- Outstanding invoice summaries for authorized projects
- Bounded payment-event summaries, not raw Stripe event payloads

**Default-deny financial actions:**
- Sending or finalizing invoices
- Creating live payment links
- Creating Checkout Sessions
- Executing refunds
- Initiating purchases, spend, card activity, or vendor orders
- Changing Stripe products, prices, tax settings, or bank/payout configuration

All live money-moving actions require explicit worker approval unless the worker
adds a narrower allowlist with amount, project, client, and action limits.

**Commerce tools exposed by the optional `domain-commerce` plugin:**

| Tool | Purpose | Default Approval |
|------|---------|------------------|
| `commerce_policy` | Show current commerce policy, key mode, and approval gates without secrets | Not required |
| `commerce_catalog_list` | Show approved services, supplies, rates, Stripe price IDs | Not required |
| `commerce_invoice_draft` | Draft invoice from project/client context | Not required |
| `commerce_invoice_send` | Finalize/send Stripe invoice | Required |
| `commerce_payment_link_create` | Create payment link for service or reimbursable item | Required unless explicitly allowlisted |
| `commerce_checkout_create` | Create one-time Checkout Session | Required |
| `commerce_payment_status` | Check invoice/session/payment state | Not required |
| `commerce_event_list` | Summarize recent payment events | Not required, no raw export |
| `commerce_refund_draft` | Draft refund action | Not required |
| `commerce_refund_execute` | Execute refund | Always required |

**Stripe constraints:**
- Use restricted Stripe API keys for plugin/MCP access. Live broad secret keys are out of bounds for agent tools.
- Hosted Checkout, Payment Links, and Invoices are preferred because the framework should not handle card data.
- Payment completion must be verified through Stripe webhooks or Stripe API status checks, not success URLs or memory alone.
- Stripe can bill a client for supplies, but it does not buy supplies from third-party vendors. Actual purchasing requires a future procurement/card/vendor integration.
- Raw Stripe event payloads, customer PII, tax details, and full financial records are not exported by default.
- Deprecated Stripe surfaces are out of bounds for new work: Charges API, Sources API, Tokens API, and legacy Card Element.
- Payment Links and Checkout Sessions must include an approval reference in metadata when created by the plugin.

The template pins Stripe API requests to `2026-02-25.clover` until a worker
deliberately upgrades after checking Stripe's current version guidance.

Stripe MCP may be used for admin or exploration when explicitly approved. The
production framework path is a narrow OpenClaw `domain-commerce` plugin,
installed with `install.sh --enable-commerce`, that enforces this dock policy.

---

## G. Version Log

| Date | Change | Notes |
|------|--------|-------|
| {{INSTALL_DATE}} | Initial OpenClaw dock setup | Domain: {{DOMAIN_NAME}}, Persona: {{PERSONA_NAME}} |
