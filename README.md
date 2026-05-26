# MASTER OpenClaw Agent Template

A template for building a portable, domain-scoped knowledge worker agent on OpenClaw. The framework layers a domain routing table, persona, memory, skills, and project structure on top of OpenClaw's native workspace — enhancing what OC creates rather than duplicating it.

---

## Prerequisites

| Requirement | Why |
|---|---|
| **OpenClaw** — installed, initialized, and on `$PATH` | Creates `~/.openclaw/workspace/` that our framework builds on. `openclaw --version` should return a version. |
| **Node.js 18+** | Required by `install.sh` and the validate/build scripts. |
| **git** | Required by `bootstrap.sh` to clone/update the template. |

**OpenClaw must be installed and initialized before running this installer.** The workspace at `~/.openclaw/workspace/` must exist. If it doesn't, run `openclaw onboard` first.

---

## Architecture

```
~/.openclaw/
├── workspace/                    ← OC's native workspace (brain files, git-tracked)
│   ├── AGENTS.md                 ← OC creates; installer replaces with domain routing
│   ├── SOUL.md                   ← OC-owned; worker fills (docs/agents/persona.md)
│   ├── HEARTBEAT.md              ← OC-owned; worker fills (docs/agents/heartbeat-tasks.md)
│   ├── USER.md                   ← OC-owned; worker fills (docs/agents/user-context.md)
│   ├── IDENTITY.md               ← OC-owned
│   ├── TOOLS.md                  ← OC-owned
│   ├── MEMORY.md                 ← installer adds
│   ├── DOCK.md                   ← installer adds
│   ├── context/                  ← installer adds
│   ├── skills/                   ← installer adds (skills/vendor for installed skills)
│   └── projects/                 ← installer adds (from base/ template)
│       └── <project-slug>/
│
├── agents/
│   └── main/                     ← OC runtime only (sessions, state) — never our content
│
└── plugins/
    ├── domain-memory-<domain>/   ← installer adds (slug-suffixed)
    └── domain-skills-<domain>/   ← installer adds
```

Single-domain install reuses OC's native `main` agent (created by `openclaw onboard`). Our framework adds the routing table, memory, plugins, and project scaffolding on top of OC's workspace; the worker fills the OC-owned bootstrap files from `docs/agents/`. Future multi-domain support uses `openclaw agents add --workspace ~/.openclaw/workspaces/<slug>/`.

---

## Getting Started

### Step 0 — Install and initialize OpenClaw

Install OpenClaw and run initial setup:

```bash
openclaw onboard
```

This creates `~/.openclaw/workspace/` with native brain files (`AGENTS.md`, `SOUL.md`, `HEARTBEAT.md`, `USER.md`, `IDENTITY.md`, `TOOLS.md`). Our installer builds on this — it must exist before Step 4.

---

### Step 1 — Bootstrap the template

Run this once to clone the template to your machine:

```bash
curl -fsSL https://raw.githubusercontent.com/kevindelta/MASTER-claude-pi-template/main/bootstrap.sh | bash
```

This clones the template to `~/.openclaw/templates/master-agent-template` and runs a dry-run pre-flight check. **Nothing is installed yet.**

> Already have the repo? `cd` into it and skip to Step 2.

---

### Step 2 — Open the intake wizard

```bash
open ~/.openclaw/templates/master-agent-template/Intake-mapping/wyndelta-onboarding.html
```

Or with `--open` on the bootstrap command:

```bash
curl -fsSL https://raw.githubusercontent.com/kevindelta/MASTER-claude-pi-template/main/bootstrap.sh | bash -s -- --open
```

The wizard is a local HTML file. It runs entirely in your browser with no network calls.

---

### Step 3 — Fill in the 5 intake sections

| Section | What it captures |
|---|---|
| **§1 Identity** | Your name, domain name, what you do, industry |
| **§2 Work Types** | 2–4 types of work your agent will do (becomes routing rows + area folders) |
| **§3 Goals** | What you want to change or improve |
| **§4 Setup** | Domain slug, persona name, optional project name |
| **§5 Finish** | Review and copy the install command |

---

### Step 4 — Install

On the **Finish** screen, click **"Copy install command (recommended)"** and paste it into the terminal:

```bash
# This is what gets pasted — shape will match your intake:
TEMPLATE_DIR="${TEMPLATE_DIR:-$HOME/.openclaw/templates/master-agent-template}"
cat <<'WYNDELTA_INTAKE_EOF' | "$TEMPLATE_DIR/install.sh" --intake-stdin
{ ... your intake JSON ... }
WYNDELTA_INTAKE_EOF
```

The installer will:

1. Verify `~/.openclaw/workspace/` exists (fail with instructions if not)
2. Replace `AGENTS.md` with the combined global + domain routing table
3. Add template-owned files: `MEMORY.md`, `DOCK.md`, `context/`, plus reference config snapshot (`openclaw.domain.json5`, `.env.example`)
4. Leave OpenClaw-owned files (`SOUL.md`, `HEARTBEAT.md`, `USER.md`, `IDENTITY.md`, `TOOLS.md`) untouched — those are filled by the worker using `docs/agents/`
5. Generate the `SKILLS.md` index for the workspace
6. Install the `domain-memory` and `domain-skills` OpenClaw plugins (slug-suffixed)
7. Create `.env` from template (skipped if already present)
8. Sync identity to OpenClaw's `main` agent
9. Configure heartbeat defaults through OpenClaw config — including the prompt that binds every heartbeat turn to the `AGENTS.md` routing table
10. Optionally onboard the gateway daemon and pull `nomic-embed-text` via ollama
11. Create a `<persona>` shell alias and `<persona>-status` dashboard function

See [`docs/adr/0004-template-oc-surface-ownership.md`](docs/adr/0004-template-oc-surface-ownership.md) for the durable rule: the template owns the routing contract and plugin trio; OpenClaw owns its bootstrap files.

---

### Step 5 — Validate

> **Prerequisite:** Step 4 must have completed successfully.

```bash
~/.openclaw/templates/master-agent-template/install.sh --validate --domain <your-slug>
```

Checks: workspace exists, template-owned files present (`AGENTS.md`, `MEMORY.md`, `DOCK.md`, `context/domain.md`, `.env`), routing table has rows, no leftover annotation blocks, `.env` keys set, agent registered. Soft-warns when OpenClaw-owned `SOUL.md` / `HEARTBEAT.md` are empty or stub.

If you see `FAIL workspace exists`, run `openclaw onboard` and then re-run Step 4.

---

### Step 6 — Fill in your workspace

Open `~/.openclaw/workspace/` and fill in these files before your first session. The split below is the ADR-0004 ownership boundary: the installer shipped annotated scaffolds for the template-owned set; the OpenClaw-owned set is empty (or OC's stub) and you fill it yourself from `docs/agents/`.

**Template-owned (annotated scaffolds — fill in, delete annotations):**

| File | What to fill in |
|------|------------------|
| `AGENTS.md` | Replace placeholder routing rows; delete `<!-- ... -->` annotation blocks. |
| `context/domain.md` | What your domain is, current focus, active projects. |
| `DOCK.md` | Confirm Carried/Domain, Carried/Persona, Carried/Skills sections. |
| `MEMORY.md` | Capture any starting decisions, patterns, preferences. |
| `.env` | Copy from `.env.example`; fill in secrets. Never commit this file. |

**OpenClaw-owned (template ships nothing — fill from `docs/agents/`):**

| File | Reference |
|------|-----------|
| `SOUL.md` | [`docs/agents/persona.md`](docs/agents/persona.md) — persona voice, identity, pushback thresholds |
| `HEARTBEAT.md` | [`docs/agents/heartbeat-tasks.md`](docs/agents/heartbeat-tasks.md) — paste-block with the default 5 recurring tasks |
| `USER.md` | [`docs/agents/user-context.md`](docs/agents/user-context.md) — who the worker is |

---

### Step 7 — First session

```bash
openclaw agent --agent main --message "status" --local
```

Or use the persona alias created by install:

```bash
<persona-slug> "summarize active work"
```

Check the worker dashboard anytime:

```bash
<persona-slug>-status
```

---

## Adding a project

After the domain is installed, create a project inside the workspace:

```bash
~/.openclaw/templates/master-agent-template/install.sh \
  --domain <domain-slug> --persona <persona-name> \
  --project-slug <project-name>
```

This creates `~/.openclaw/workspace/projects/<project-slug>/` from the `base/` template — with its own `AGENTS.md`, `TOOLS.md`, `context/`, and `areas/` directories.

---

## OpenClaw vs this framework

| Layer | Owned by |
|-------|----------|
| Runtime, channels, identity, auth, heartbeat scheduling, plugin loading | OpenClaw |
| Bootstrap files: `SOUL.md`, `HEARTBEAT.md`, `USER.md`, `IDENTITY.md`, `TOOLS.md` | OpenClaw (worker fills using `docs/agents/`) |
| Routing contract: `AGENTS.md`, `MEMORY.md`, `DOCK.md`, `context/`, project layer under `base/` | This framework |
| Plugin trio: `domain-memory`, `domain-skills`, optional `domain-commerce` | This framework |
| Heartbeat *binding* to the routing table | OpenClaw config string set by `install.sh` (not file authorship) |

OpenClaw creates the workspace. This framework populates the template-owned files with the routing contract and ships the plugins. The worker fills the OpenClaw-owned bootstrap files themselves from `docs/agents/`. The durable rule lives in [`docs/adr/0004-template-oc-surface-ownership.md`](docs/adr/0004-template-oc-surface-ownership.md) and is enforced by [`scripts/lint-ownership.mjs`](scripts/lint-ownership.mjs).

---

## Updating the template

```bash
cd ~/.openclaw/templates/master-agent-template
git pull --ff-only
```

---

## Notes

- Do not commit `.env` files, client bundles, or secrets.
- Heartbeat — do not create cron jobs, launchd jobs, or systemd timers. The `tasks:` block in `HEARTBEAT.md` is the source of truth; use the paste-block in [`docs/agents/heartbeat-tasks.md`](docs/agents/heartbeat-tasks.md) to install the defaults.
- The template never writes to `SOUL.md`, `HEARTBEAT.md`, `USER.md`, or `IDENTITY.md`. [`scripts/lint-ownership.mjs`](scripts/lint-ownership.mjs) enforces this.
- `DOCK.md` is the policy contract for memory export, host/channel access, and optional commerce boundaries.
- Optional Stripe commerce tooling: `install.sh --enable-commerce`. See `DOCK.md §F` for constraints.
