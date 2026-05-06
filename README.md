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
│   ├── SOUL.md                   ← OC creates; installer appends domain identity
│   ├── HEARTBEAT.md              ← OC creates; installer appends domain task block
│   ├── TOOLS.md                  ← OC creates; leave alone
│   ├── MEMORY.md                 ← installer adds
│   ├── DOCK.md                   ← installer adds
│   ├── context/                  ← installer adds
│   ├── skills/                   ← installer adds
│   └── projects/                 ← installer adds (from base/ template)
│       └── <project-slug>/
│
├── agents/
│   └── <domain>/                 ← OC runtime only (sessions, state)
│
└── plugins/
    └── domain-memory-<domain>/   ← installer adds
```

The domain agent (`openclaw agents add <domain>`) uses OC's native workspace. Our framework adds the routing table, persona, memory, and project scaffolding on top of what OC already created.

---

## Getting Started

### Step 0 — Install and initialize OpenClaw

Install OpenClaw and run initial setup:

```bash
openclaw onboard
```

This creates `~/.openclaw/workspace/` with native brain files (AGENTS.md, SOUL.md, HEARTBEAT.md, TOOLS.md). Our installer builds on this — it must exist before Step 4.

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
2. Replace `AGENTS.md` with the domain routing table (global + domain combined)
3. Append the domain identity section to `SOUL.md`
4. Append the domain task block to `HEARTBEAT.md`
5. Add `MEMORY.md`, `DOCK.md`, `context/`, `skills/` (skipped if already present)
6. Install the domain-memory plugin
7. Create `.env` from template (skipped if already present)
8. Register the domain agent with OpenClaw
9. Configure heartbeat defaults
10. Create a `<persona>` shell alias and `<persona>-status` dashboard function

---

### Step 5 — Validate

> **Prerequisite:** Step 4 must have completed successfully.

```bash
~/.openclaw/templates/master-agent-template/install.sh --validate --domain <your-slug>
```

This checks: workspace exists, OC native files present, domain routing section in AGENTS.md, domain identity in SOUL.md, domain tasks in HEARTBEAT.md, required framework files present, `.env` keys set, agent registered.

If you see `FAIL workspace exists`, run `openclaw onboard` and then re-run Step 4.

---

### Step 6 — Fill in your workspace

Open `~/.openclaw/workspace/` and fill in these files before your first session:

| File | What to fill in |
|---|---|
| `SOUL.md` | The `# Domain Identity` section appended by the installer — persona voice, identity, relationship. |
| `AGENTS.md` | Replace placeholder routing rows; delete `<!-- ... -->` annotation blocks. |
| `context/domain.md` | What your domain is, current focus, active projects. |
| `DOCK.md` | Confirm the Carried/Domain, Carried/Persona, and Carried/Skills sections. |
| `HEARTBEAT.md` | Review the default recurring tasks; add or trim as needed. |
| `.env` | Copy from `.env.example`; fill in secrets. Never commit this file. |

---

### Step 7 — First session

```bash
openclaw agent --agent <domain-slug> --message "status" --local
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
|---|---|
| Runtime, channels, identity, auth, heartbeat scheduling, plugin loading | OpenClaw |
| Native workspace files (AGENTS.md, SOUL.md, HEARTBEAT.md, TOOLS.md) | OpenClaw |
| Domain routing table, persona, memory, skills, projects | This framework |

OpenClaw creates the workspace. This framework populates it with domain-specific identity and makes it routing-first.

---

## Updating the template

```bash
cd ~/.openclaw/templates/master-agent-template
git pull --ff-only
```

---

## Notes

- Do not commit `.env` files, client bundles, or secrets.
- `HEARTBEAT.md` — do not create cron jobs, launchd jobs, or systemd timers. The `# Domain Tasks:` block is the source of truth.
- `DOCK.md` is the policy contract for memory export, host/channel access, and optional commerce boundaries.
- Optional Stripe commerce tooling: `install.sh --enable-commerce`. See `DOCK.md §F` for constraints.
