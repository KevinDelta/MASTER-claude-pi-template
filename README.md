# MASTER OpenClaw Agent Template

Portable, domain-scoped knowledge worker agent template for OpenClaw. The
framework is routing-table-first: OpenClaw handles runtime, gateway, channels,
identity, heartbeat, and plugin loading; this template defines domain context,
project context, local memory, skills, and dock/export policy.

## Quick Start

Run from any directory:

```bash
curl -fsSL https://raw.githubusercontent.com/kevindelta/MASTER-claude-pi-template/main/bootstrap.sh | bash
```

The bootstrap clones or updates the template at:

```text
~/.openclaw/templates/master-agent-template
```

Then open the local onboarding wizard:

```bash
cd ~/.openclaw/templates/master-agent-template
open Intake-mapping/wyndelta-onboarding.html
```

The wizard generates a client/domain bundle and `setup-client.sh`. From the
template repo root, run:

```bash
bash setup-client.sh
openclaw agent --agent <domain-slug> --message "status" --local
```

## Bootstrap Options

Use a different repo, branch, or install path:

```bash
curl -fsSL https://raw.githubusercontent.com/kevindelta/MASTER-claude-pi-template/main/bootstrap.sh | \
  bash -s -- --repo https://github.com/<org>/<repo>.git --branch main --dir ~/.openclaw/templates/test-template
```

Open the wizard automatically on macOS:

```bash
curl -fsSL https://raw.githubusercontent.com/kevindelta/MASTER-claude-pi-template/main/bootstrap.sh | bash -s -- --open
```

Skip the dry-run smoke check:

```bash
curl -fsSL https://raw.githubusercontent.com/kevindelta/MASTER-claude-pi-template/main/bootstrap.sh | bash -s -- --skip-smoke
```

Equivalent environment overrides:

```bash
OPENCLAW_TEMPLATE_REPO_URL=https://github.com/<org>/<repo>.git
OPENCLAW_TEMPLATE_BRANCH=main
OPENCLAW_TEMPLATE_DIR=~/.openclaw/templates/master-agent-template
```

## What Gets Installed

`bootstrap.sh` installs the template checkout only. It does not create a live
domain until the generated `setup-client.sh` or `install.sh` is run.

The generated setup creates:

```text
~/.openclaw/workspaces/<domain>/
├── AGENTS.md
├── SOUL.md
├── HEARTBEAT.md
├── MEMORY.md
├── DOCK.md
├── context/
└── skills/
```

Project repos are created from `base/` and use `PROJECT_ID` for memory tagging.

## Updating

```bash
cd ~/.openclaw/templates/master-agent-template
git pull --ff-only
```

Or rerun the bootstrap command; it updates the existing checkout when it is
clean.

## Notes

- Do not commit filled `.env` files, client bundles, generated client repos, or secrets.
- `HEARTBEAT.md` replaces `watches.yaml`; no OS scheduler is part of the active runtime.
- `DOCK.md` is the policy contract for export, memory, host/channel, and optional commerce boundaries.
