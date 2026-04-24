# SPEC v3 — Auth, HTTP Transport, Worker UX, and Intelligence Loops

**Status:** In progress. §5 (FastMCP) and §13 (two-layer architecture) are complete as of 2026-04-21. See `CHANGELOG.md` for full changelog and `../.dev-tracking/BACKLOG.md` for remaining work.

---

## 1. What v2 established

V2 is the framework operator's version. It ships the full infrastructure a knowledge worker's pi needs:

- Three-layer AGENTS.md (global → domain → project)
- Embedded memory DB (SQLite + sqlite-vec, one file per domain)
- PI_DOCK.md host interface declaration
- Declarative watches + OS scheduler integration
- Standalone MCP server (stdio, allowlist-enforced)
- One-command install (`install.sh`)

The v2 user is the person building and configuring the domain. They edit files, run install.sh, and set up the environment. They are technical.

**SPEC-v2.md is the authoritative reference for v2 architecture.** Do not modify v2 design decisions in this document — update SPEC-v2.md directly.

---

## 2. The v3 user shift

The v3 user is the knowledge worker who uses the installed product. They did not set it up. They are not expected to edit YAML, write SQL, or understand extension lifecycle hooks.

V3 work falls into two categories:

1. **Infrastructure the framework operator needs but v2 left out** — auth, HTTP transport, multi-device. These unblock real deployment scenarios.
2. **Worker-facing UX** — natural-language configuration, model routing, intelligence loops. These make the system useful without requiring technical depth.

The boundary between v2 and v3 is not a quality line. V2 is complete and production-ready for the framework operator. V3 extends the user base to the knowledge worker themselves.

---

## 3. Architecture evolution

V3 does not replace v2. It extends it at three seams:

| Seam | V2 state | V3 change |
|------|----------|-----------|
| Access control | OS file permissions only | `PI_WORKER_TOKEN` as unified auth primitive |
| MCP transport | stdio only | HTTP+SSE added as optional second transport |
| Memory substrate | SQLite + sqlite-vec | LanceDB migration path (multi-device write safety) |
| Domain configuration | File editing | Natural-language authoring layer (no file editing required) |
| System intelligence | Static routing and memory | Compounding feedback loops |

---

## 4. Auth

Full design in SPEC-v2.md Section 14. Summary:

Two surfaces guard the same underlying data from opposite directions:

```
[remote host] → MCP auth → mcp-server.ts → memory.db ← domain auth ← [local shell / pi session]
```

**Unified primitive:** `PI_WORKER_TOKEN` — a secret generated at domain install time. Used by domain auth to gate pi session starts, and by MCP auth as a bearer token for authorized remote hosts.

### Domain auth (inward)

Gate on `PI_WORKER_TOKEN` before domain context loads. Relevant for shared machines and multi-worker domains.

Implementation options (decide at build time):
- Session PIN check in a `session_start` extension hook
- Pre-session wrapper script that checks the token before handing off to pi

### MCP auth (outward)

Requires HTTP transport (Section 5). When `PI_MCP_TRANSPORT=http`, validate `Authorization: Bearer <PI_WORKER_TOKEN>` on every request. Hard-reject without the token.

### Multi-worker domains

Worker identity should be carried in observation rows when multiple people write to the same domain DB. Requires a `PI_WORKER_ID` field alongside `PI_PROJECT_ID`. Design this before implementing multi-worker support — it is a schema change.

---

## 5. HTTP MCP transport + FastMCP Migration

The standalone MCP server (v2) uses stdio transport — suitable for Claude Desktop on the same machine. The PI_DOCK.md model describes remote hosts connecting to a worker's domain. That requires HTTP transport.

**When `PI_MCP_TRANSPORT=http`:**
- Server binds to `PI_MCP_PORT` (default: 3222)
- All requests require `Authorization: Bearer <PI_WORKER_TOKEN>`
- CORS: accept only origins declared in PI_DOCK.md Section C
- TLS at the network layer (reverse proxy responsibility — not in the server itself)

**Dependency:** Auth (Section 4) must be designed first. HTTP transport without auth is a security hole.

### Implementation: FastMCP migration

Rather than hand-rolling HTTP transport into the existing `mcp-server.ts`, migrate to **FastMCP** (`fastmcp` npm package, v4.0.0). FastMCP is a thin abstraction layer over `@modelcontextprotocol/sdk` that provides:
- HTTP transport via a single config flag (`transportType: "httpStream"`)
- Built-in API key auth via the `authenticate` option
- ~80% boilerplate reduction (~420 lines → ~80 lines)
- Tool registration via `server.addTool()` instead of `setRequestHandler` switch blocks

This migration delivers the entire HTTP transport + auth tranche as a refactor of `mcp-server.ts`, not a net-new build. All 7 existing tools and the hard-reject policy are preserved verbatim.

**New env vars:**

| Var | Values | Default |
|-----|--------|---------|
| `PI_MCP_TRANSPORT` | `stdio` \| `http` | `stdio` |
| `PI_MCP_PORT` | port number | `3222` |
| `PI_WORKER_TOKEN` | bearer token string | — (required when HTTP) |

**Startup pattern:**
```typescript
import { FastMCP } from "fastmcp";

const transport = process.env.PI_MCP_TRANSPORT === "http" ? "httpStream" : "stdio";

const server = new FastMCP({
  name: `pi-${DOMAIN_NAME}`,
  version: "3.0.0",
  ...(transport === "httpStream" && {
    authenticate: async (req) => {
      const token = req.headers.authorization?.replace("Bearer ", "");
      if (token !== process.env.PI_WORKER_TOKEN) throw new Error("Unauthorized");
    },
  }),
});

// addTool() for each of the 6 allowlisted tools + hard-reject on get_raw_observations

server.start(
  transport === "httpStream"
    ? { transportType: "httpStream", httpStream: { port: Number(process.env.PI_MCP_PORT ?? 3222) } }
    : { transportType: "stdio" }
);
```

**install.sh change:** replace `@modelcontextprotocol/sdk` with `fastmcp` in the `npm install -g` prerequisites. FastMCP bundles the SDK and Zod.

**Files changed:** `domain/.pi/mcp-server.ts` (full rewrite), `domain/.pi/extensions/.env.example` (3 new vars), `install.sh` (prerequisites), `xDOCS/BLUEPRINT.md` (MCP server section).

---

## 6. Multi-device sync

Documented as roadmap in SPEC-v2.md Section 16. Needs to move from roadmap to operational guide.

### Phase 1 — filesystem sync (sqlite-vec era)

- **macOS:** keep `~/.pi/domain/<name>/` in iCloud Drive. Single-writer (one active device at a time). Zero config.
- **Cross-platform:** syncthing. Peer-to-peer, no cloud intermediary. Configure exclude patterns for `.pi/.env`.
- **Mobile read:** push domain directory to a private git repo. Mobile client reads MEMORY.md and AGENTS.md. Memory DB not accessible on mobile in this phase.

Constraint: both options assume one active writer. Concurrent writes to `memory.db` from two devices will corrupt the DB. Document this explicitly in the install flow.

### Phase 2 — LanceDB migration

LanceDB has native object-storage backends (S3, R2, GCS). Multi-writer becomes safe. Migration is the primary functional reason to move off sqlite-vec.

Migration path (design at build time, not here):
1. Export observations to JSON
2. Reimport into LanceDB with same schema
3. Update `memory-db.ts` driver
4. Update `mcp-server.ts` DB client

---

## 7. Natural-language authoring layer

The v3 UX gap: configuring a domain requires editing AGENTS.md, SOUL.md, watches.yaml, and context files. A knowledge worker should not need to do this.

**Target state:** a worker describes their domain in plain language. The authoring layer generates the file structure.

```
"I'm a freelance GTM consultant. I work with 3–5 clients at a time on go-to-market strategy,
positioning, and sales enablement. My main deliverables are strategy docs and enablement materials."
```

→ generates `domain.md`, `AGENTS.md` routing scaffold, `watches.yaml` with relevant default watches, and `SOUL.md` prompt.

**Scope:**
- Onboarding flow only (not ongoing reconfiguration)
- Output is the same file structure v2 uses — no new runtime format
- Worker reviews and edits the generated files before going live

**Dependency:** v2 install infrastructure must be complete. This layer sits on top of it.

---

## 8. Model routing hooks

From Pi_review.md item #10, deferred from v2.

Dynamically adjust the model used for a session based on prompt complexity or task type. Example: Opus for architecture decisions, Haiku for quick edits, Sonnet for standard work.

**Implementation target:** a `before_agent_start` hook in a dedicated extension that inspects the prompt and sets `ctx.model` based on routing rules declared in domain settings.

```yaml
# domain/.pi/settings.json addition (design at build time)
modelRouting:
  - match: "architect|design|refactor"
    model: "claude-opus-4-7"
  - match: "edit|fix|update"
    model: "claude-haiku-4-5"
  - default: "claude-sonnet-4-6"
```

**Caution:** invisible behavior in a template can produce surprising results. Routing rules must be explicit and easily disabled. Document clearly.

---

## 9. RPC mode for watches

From Pi_review.md item #15, deferred from v2.

Structured two-way communication for watches — watches receive previous results and emit structured JSON for parsing. Relevant when a watch's output feeds another process or needs to be compared against a prior run.

**Current state:** watches emit to `notify | append MEMORY.md | silent`. JSON-mode watches (v2) produce structured output but no two-way channel.

**V3 target:** `output: rpc` mode in watches.yaml. Pi emits JSON to stdout, calling process reads it, can pass structured input back on the next run via a state file or DB row.

**Dependency:** requires pi.dev to support structured stdin/stdout for headless runs, or a thin wrapper process that manages the exchange.

---

## 10. Package distribution

From Pi_review.md item #12, deferred from v2.

Bundle domain extensions and skills as installable pi packages (`npm:` or `git:` schemes).

```bash
pi install git:github.com/org/domain-pi-package
```

**What a package contains:** curated `AGENTS.md` routing rows, skills, extensions, and context templates for a specific domain type (e.g. `pi-gtm-domain`, `pi-eng-domain`).

**Value:** one-command setup for a new worker joining an org that has already built their domain package. Removes all manual file editing from the install flow.

**Dependency:** natural-language authoring layer (Section 7) should be designed first — packages and the authoring layer together define the full worker onboarding UX.

---

## 11. Compounding intelligence loops

From SPEC-v2.md Section 15. Design reproduced here for completeness; original section in SPEC-v2.md is the reference.

| Loop | Mechanism | Trigger |
|------|-----------|---------|
| **Routing refinement** | Track which loaded skills were used vs ignored per session. Surface low-hit routing rows for pruning. | Monthly watch |
| **Goal adjustment** | When a goal misses by the same delta over 3+ consecutive checks, propose recalibration of the target. | After 3 consecutive misses |
| **Skill drift detection** | When one skill loads for many task types, flag it for splitting into narrower skills. | Weekly analysis |
| **Bootstrap quality loop** | When a new project's context files are heavily edited by the worker, capture those edits as domain-level corrections. | `agent_end` hook |

All depend on Phase 2 of v2 (memory DB) being in place. That dependency is now met.

---

## 12. Deferred to v4+

Items from Pi_review.md that are too speculative or heavy for v3:

| Item | Reason deferred |
|------|----------------|
| Custom UI components (`ctx.ui.custom()`) | Requires deep pi.dev internals knowledge; UX scope unclear |
| SDK domain dashboard | External app; separate project, not a template concern |
| Image support in memory | Requires multimodal embedding model; infrastructure not ready |
| Custom tool call rendering | TUI customization; cosmetic, low leverage |
| Multi-domain switching commands | `pi domain use <name>` already exists; incremental at best |
| Theme customization | Cosmetic |
| Session sharing to Hugging Face | Opinionated and optional; not universal |

---

## 13. Architecture simplification: two-layer model

V2 specified a three-layer AGENTS.md architecture (global → domain → project). During the first e2e walkthrough (2026-04-21) we discovered pi does not natively support the domain layer — it does not read `active-domain` or `PI_DOMAIN_NAME` to auto-discover `~/.pi/domain/<name>/AGENTS.md`. The domain layer was wired via `--append-system-prompt` in the persona alias, which is a workaround, not a first-class mechanism.

**Decision:** merge domain AGENTS.md content into the global layer. The effective architecture becomes two layers that pi supports natively.

### Before (v2 as designed, three layers)

```
~/.pi/agent/AGENTS.md          ← global (org standards)         pi native ✅
~/.pi/domain/<name>/AGENTS.md  ← domain (--append-system-prompt) workaround ⚠️
<project>/AGENTS.md            ← project                         pi native ✅
```

### After (v3, two effective layers)

```
~/.pi/agent/AGENTS.md          ← global + domain (combined by install.sh)  pi native ✅
<project>/AGENTS.md            ← project                                    pi native ✅
```

The domain directory (`~/.pi/domain/<name>/`) is unchanged — it continues to hold memory.db, SOUL.md, context files, skills, watches, and the extension. Only AGENTS.md moves.

### How install.sh builds the combined global layer

install.sh concatenates `global/AGENTS.md` (org standards) and `domain/AGENTS.md` (domain vocabulary, methods, routing table) into `~/.pi/agent/AGENTS.md` with a `# Domain: <name>` header divider. The operation is idempotent: install.sh truncates any existing `# Domain:` section before appending, so re-runs and domain switches are clean.

```
~/.pi/agent/AGENTS.md structure after install:

  [content of global/AGENTS.md]

  ---

  # Domain: supply-chain-1

  [content of domain/AGENTS.md — substituted]
```

### Alias simplification

The `--append-system-prompt` flag is removed from the persona alias. Domain content is now in global AGENTS.md, which pi reads natively.

**Before:**
```bash
alias nova='PI_DOMAIN_NAME=supply-chain-1 pi \
  --append-system-prompt ~/.pi/domain/supply-chain-1/AGENTS.md \
  -e ~/.pi/domain/supply-chain-1/.pi/extensions/memory-db.ts'
```

**After:**
```bash
alias nova='PI_DOMAIN_NAME=supply-chain-1 pi \
  -e ~/.pi/domain/supply-chain-1/.pi/extensions/memory-db.ts'
```

`PI_DOMAIN_NAME` is still required (memory-db extension uses it to open the correct DB). `-e` is still required (extension is not globally registered — domain-scoped only).

### domain/.pi/settings.json

This file is reference/documentation only — pi does not auto-load it. A `REFERENCE ONLY` comment is added to make this explicit so future workers don't expect it to apply automatically.

### Multi-domain support

The `# Domain:` section header enables clean domain switching: install.sh for a second domain replaces from that header to end-of-file, leaving org-wide global standards intact.

### Template repo changes

- `domain/AGENTS.md` — annotation updated; content unchanged; now understood as "the domain section appended to global by install.sh"
- `global/AGENTS.md` — annotation updated to note domain content is appended below
- `install.sh` — Step 3: build combined AGENTS.md instead of deploying domain AGENTS.md separately; Step 9: clean alias without `--append-system-prompt`
- `xDOCS/BLUEPRINT.md` — architecture section updated to describe two effective layers

---

## 14. Build order guidance

Not a sprint plan — see `../.dev-tracking/BACKLOG.md` for the ordered task list. This is dependency sequencing only.

```
Two-layer architecture (§13) — no dependencies; do first, unblocks alias cleanup
      ↓
FastMCP migration (§5) — delivers HTTP transport + auth in one move
      ↓
Multi-device sync docs (§6) — can parallel with FastMCP
      ↓
Model routing hooks (§8) — independent
      ↓
Natural-language authoring (§7) → Package distribution (§10)
      ↓
Compounding loops (§11) — requires sustained memory DB usage to tune
      ↓
RPC watches (§9) — requires pi.dev cooperation or wrapper process
```

The first two items (two-layer architecture + FastMCP) are pure infrastructure changes with no worker-facing UX impact. They fix known gaps from the e2e walkthrough and pull the v3 HTTP+auth requirement forward as a refactor. Ship these first.
