# MASTER OpenClaw Agent Template

A template for building a portable, domain-scoped knowledge worker agent on OpenClaw. The framework is routing-table-first: OpenClaw handles the runtime, channels, identity, heartbeat, and plugins; this template defines who the agent is, how it works, what it knows, and what it's allowed to do.

---

## Prerequisites

Before you start:

| Requirement | Why |
|---|---|
| **OpenClaw** — installed and on `$PATH` | The runtime that runs your agent. `openclaw --version` should return a version. |
| **Node.js 18+** | Required by `install.sh` and the validate/build scripts. |
| **git** | Required by `bootstrap.sh` to clone/update the template. |

Install OpenClaw first. Everything else follows from it.

---

## Getting Started

### Step 1 — Bootstrap the template

Run this once to clone the template to your machine:

```bash
curl -fsSL https://raw.githubusercontent.com/kevindelta/MASTER-claude-pi-template/main/bootstrap.sh | bash
```

This clones the template to `~/.openclaw/templates/master-agent-template` and runs a dry-run pre-flight check. **Nothing is installed yet.** The output tells you so explicitly.

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

2–4 work types is typical. Name them as you'd describe your work to a colleague, not as system categories.

---

### Step 4 — Install

On the **Finish** screen, click **"Copy install command (recommended)"** and paste it into the terminal where you ran bootstrap:

```bash
# This is what gets pasted — shape will match your intake:
TEMPLATE_DIR="${TEMPLATE_DIR:-$HOME/.openclaw/templates/master-agent-template}"
cat <<'WYNDELTA_INTAKE_EOF' | "$TEMPLATE_DIR/install.sh" --intake-stdin
{ ... your intake JSON ... }
WYNDELTA_INTAKE_EOF
```

Press Enter. `install.sh` will:

1. Create `~/.openclaw/workspaces/<domain>/` with all framework files
2. Build a combined AGENTS.md from global + domain routing layers
3. Generate SKILLS.md and POST-INSTALL-CHECKLIST.md
4. Install the domain-memory plugin
5. Register an OpenClaw agent for the domain
6. Configure heartbeat defaults
7. Create a `<persona>` shell function and `<persona>-status` dashboard function

The terminal output shows every step and the path of every file created.

---

### Step 5 — Validate

> **Prerequisite:** Step 4 must have completed successfully. If the install command from the wizard printed errors or you skipped it, run it again before validating.

Confirm the install is clean:

```bash
~/.openclaw/templates/master-agent-template/install.sh --validate --domain <your-slug>
```

`<your-slug>` is the short name you entered in the wizard §4 (e.g. `adusa-workspace`, `research-ops`). It matches the folder name under `~/.openclaw/workspaces/`.

This checks: workspace exists, required files present, no unfilled annotation blocks, `.env` set up, agent registered, routing table parses. You get a pass/fail report with file:line pointers for anything that needs attention.

If you see `FAIL workspace exists`, the domain was not installed — go back to Step 4.

---

### Step 6 — Fill in your workspace

Open `~/.openclaw/workspaces/<domain>/` and fill in these files before your first session:

| File | What to fill in |
|---|---|
| `SOUL.md` | Persona voice, identity, relationship to you. See `domain/examples/` for reference personas. |
| `AGENTS.md` | Replace the placeholder routing rows with your actual work types and context. |
| `context/domain.md` | What your domain is, current focus, active projects. |
| `DOCK.md` | Confirm the Carried/Domain, Carried/Persona, and Carried/Skills sections. |
| `HEARTBEAT.md` | Review the default recurring tasks; add or trim as needed. |
| `.env` | Copy from `.env.example`; fill in secrets. Never commit this file. |

Delete all `<!-- ... -->` annotation blocks when done. `--validate` will flag any that remain.

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

## What gets installed

```
~/.openclaw/workspaces/<domain>/
├── AGENTS.md          ← global + domain routing (combined by install.sh)
├── SOUL.md            ← persona voice and identity
├── HEARTBEAT.md       ← recurring work handled by OpenClaw heartbeat
├── MEMORY.md          ← durable facts, preferences, decisions
├── DOCK.md            ← host/channel export policy
├── SKILLS.md          ← auto-generated skill index
├── POST-INSTALL-CHECKLIST.md
├── context/
│   ├── domain.md      ← what the domain is, active projects
│   └── clients.md     ← client/stakeholder context
├── skills/            ← domain-specific skill files
└── .env               ← secrets and environment config (never commit)
```

Projects live inside the workspace at `projects/<slug>/` and are created with `--project-slug <name>`.

---

## Adding a project

After the domain is installed, create a project inside the workspace:

```bash
~/.openclaw/templates/master-agent-template/install.sh \
  --domain <domain-slug> --persona <persona-name> \
  --project-slug <project-name>
```

This creates `~/.openclaw/workspaces/<domain>/projects/<project-slug>/` from the `base/` template — with its own `AGENTS.md`, `TOOLS.md`, `context/`, and `areas/` directories. The project inherits domain routing rows and can override them.

---

## OpenClaw vs this framework

| Layer | Owned by |
|---|---|
| Runtime, channels, identity, auth, heartbeat scheduling, plugin loading | OpenClaw |
| Who the agent is, how it works, what it knows, what it's allowed to do | This framework |

OpenClaw gets a message to the right agent. This framework tells the selected agent how to work.

---

## Updating the template

```bash
cd ~/.openclaw/templates/master-agent-template
git pull --ff-only
```

Or rerun the bootstrap command — it updates the existing checkout when the working tree is clean.

---

## Notes

- Do not commit `.env` files, client bundles, or secrets.
- `HEARTBEAT.md` replaces `watches.yaml`. No OS scheduler or cron job is part of the active runtime.
- `DOCK.md` is the policy contract for memory export, host/channel access, and optional commerce boundaries.
- Optional Stripe commerce tooling: `install.sh --enable-commerce`. See `DOCK.md §F` for constraints.
- Stripe workflow documentation: `xDOCS/STRIPE_WORKFLOW.md`.
