#!/usr/bin/env bash
# install.sh - MASTER OpenClaw domain installer
#
# Sets up an OpenClaw-backed domain workspace on this machine:
#   1. Checks prerequisites (node, openclaw, ollama)
#   2. Creates ~/.openclaw/workspaces/<domain-name>/
#   3. Deploys domain templates (AGENTS.md, SOUL.md, HEARTBEAT.md, MEMORY.md, context, skills, DOCK.md)
#   4. Builds routing-first AGENTS.md from global + domain sections
#   5. Installs the domain-memory OpenClaw plugin
#   6. Creates workspace env/config reference files
#   7. Registers an OpenClaw agent for the domain workspace
#   8. Configures heartbeat defaults through OpenClaw config
#   9. Pulls nomic-embed-text via ollama unless skipped
#  10. Creates a persona shell function that calls openclaw agent
#
# Usage:
#   ./install.sh --domain <name> --persona <name> [options]
#
# Options:
#   --domain <name>       Domain workspace name under ~/.openclaw/workspaces/ (required)
#   --persona <name>      Persona name; creates CLI function (required)
#   --intake-json <file>  Canonical onboarding intake from the HTML wizard
#   --project-dir <path>  Optional project repo path to create/fill from base/
#   --model <provider/id> Primary model (default: anthropic/claude-sonnet-4-5)
#   --thinking <level>    off|minimal|low|medium|high|xhigh (default: medium)
#   --heartbeat <dur>     OpenClaw heartbeat interval (default: 30m)
#   --enable-commerce     Install optional domain-commerce Stripe plugin template
#   --skip-ollama         Skip ollama install/model pull
#   --skip-gateway        Skip openclaw onboard --install-daemon
#   --yes                 Skip confirmation prompts
#   --dry-run             Print what would happen without executing

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[install]${NC} $*"; }
success() { echo -e "${GREEN}[install]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC}    $*"; }
error()   { echo -e "${RED}[error]${NC}   $*" >&2; }
die()     { error "$*"; exit 1; }

DOMAIN_NAME=""
PERSONA_NAME=""
INTAKE_JSON=""
PROJECT_DIR=""
MODEL="anthropic/claude-sonnet-4-5"
THINKING="medium"
HEARTBEAT_EVERY="30m"
ENABLE_COMMERCE=false
SKIP_OLLAMA=false
SKIP_GATEWAY=false
YES=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain) DOMAIN_NAME="$2"; shift 2 ;;
    --persona) PERSONA_NAME="$2"; shift 2 ;;
    --intake-json) INTAKE_JSON="$2"; shift 2 ;;
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --model) MODEL="$2"; shift 2 ;;
    --thinking) THINKING="$2"; shift 2 ;;
    --heartbeat) HEARTBEAT_EVERY="$2"; shift 2 ;;
    --enable-commerce) ENABLE_COMMERCE=true; shift ;;
    --skip-ollama) SKIP_OLLAMA=true; shift ;;
    --skip-gateway) SKIP_GATEWAY=true; shift ;;
    --yes) YES=true; shift ;;
    --dry-run) DRY_RUN=true; shift ;;
    *) die "Unknown argument: $1" ;;
  esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

json_get() {
  local file="$1" expr="$2"
  node -e '
    const fs = require("fs");
    const data = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    const path = process.argv[2].split(".");
    let cur = data;
    for (const key of path) cur = cur && cur[key];
    process.stdout.write(String(cur || ""));
  ' "$file" "$expr"
}

slugify() {
  echo "$1" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-'
}

if [[ -n "$INTAKE_JSON" ]]; then
  [[ -f "$INTAKE_JSON" ]] || die "--intake-json file not found: $INTAKE_JSON"
  INTAKE_DOMAIN="$(json_get "$INTAKE_JSON" "identity.domainName")"
  INTAKE_SLUG="$(json_get "$INTAKE_JSON" "setup.slug")"
  INTAKE_PERSONA="$(json_get "$INTAKE_JSON" "setup.personaName")"
  INTAKE_PROJECT_DIR="$(json_get "$INTAKE_JSON" "setup.projectDir")"
  [[ -z "$DOMAIN_NAME" ]] && DOMAIN_NAME="${INTAKE_SLUG:-$INTAKE_DOMAIN}"
  [[ -z "$PERSONA_NAME" ]] && PERSONA_NAME="$INTAKE_PERSONA"
  [[ -z "$PROJECT_DIR" ]] && PROJECT_DIR="$INTAKE_PROJECT_DIR"
fi

[[ -z "$DOMAIN_NAME" ]] && read -rp "Domain name (e.g. gtm-strategy, research, ops): " DOMAIN_NAME
[[ -z "$PERSONA_NAME" ]] && read -rp "Persona name (e.g. Kai, Morgan, Ash): " PERSONA_NAME

[[ -z "$DOMAIN_NAME" ]] && die "--domain is required"
[[ -z "$PERSONA_NAME" ]] && die "--persona is required"

DOMAIN_SLUG="$(slugify "$DOMAIN_NAME")"
PERSONA_SLUG="$(slugify "$PERSONA_NAME")"

OPENCLAW_HOME="$HOME/.openclaw"
WORKSPACE_DIR="$OPENCLAW_HOME/workspaces/$DOMAIN_SLUG"
MEMORY_PLUGIN_DIR="$OPENCLAW_HOME/plugins/domain-memory-$DOMAIN_SLUG"
COMMERCE_PLUGIN_DIR="$OPENCLAW_HOME/plugins/domain-commerce-$DOMAIN_SLUG"
INSTALL_DATE="$(date '+%Y-%m-%d')"

run() {
  if $DRY_RUN; then
    echo -e "  ${YELLOW}[dry-run]${NC} $*"
  else
    eval "$@"
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  OpenClaw Domain Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Domain:    $DOMAIN_SLUG"
echo "  Persona:   $PERSONA_NAME ($PERSONA_SLUG)"
echo "  Workspace: $WORKSPACE_DIR"
echo "  Model:     $MODEL"
echo "  Thinking:  $THINKING"
echo "  Heartbeat: $HEARTBEAT_EVERY"
echo "  Commerce:  $(if $ENABLE_COMMERCE; then echo 'install domain-commerce Stripe plugin'; else echo 'disabled'; fi)"
echo "  Gateway:   $(if $SKIP_GATEWAY; then echo 'skip'; else echo 'onboard/install daemon'; fi)"
echo "  Ollama:    $(if $SKIP_OLLAMA; then echo 'skip'; else echo 'install nomic-embed-text'; fi)"
[[ -n "$INTAKE_JSON" ]] && echo "  Intake:    $INTAKE_JSON"
[[ -n "$PROJECT_DIR" ]] && echo "  Project:   $PROJECT_DIR"
$DRY_RUN && echo "  Mode:      DRY RUN - no changes will be made"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! $YES && ! $DRY_RUN; then
  read -rp "Proceed? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { info "Aborted."; exit 0; }
fi

info "Step 1/10 - Checking prerequisites..."

command -v node &>/dev/null || die "node not found. OpenClaw requires Node.js 22.16+ or 24+."
info "node: $(node --version)"

if ! command -v openclaw &>/dev/null; then
  warn "openclaw not found. Installing openclaw@latest..."
  run "npm install -g openclaw@latest"
else
  info "openclaw: $(openclaw --version 2>/dev/null || echo 'found')"
fi

info "Installing native dependencies for domain-memory plugin..."
run "npm install -g better-sqlite3 sqlite-vec @sinclair/typebox" || warn "npm install failed - plugin dependencies may need manual install"

info "Step 2/10 - Creating OpenClaw workspace..."
run "mkdir -p '$WORKSPACE_DIR/skills' '$WORKSPACE_DIR/context' '$OPENCLAW_HOME/plugins'"

deploy() {
  local src="$1" dst="$2"
  if [[ -f "$dst" ]] && ! $YES; then
    read -rp "  $dst exists. Overwrite? [y/N] " ow
    [[ "$ow" =~ ^[Yy]$ ]] || { warn "Skipping $dst"; return; }
  fi
  run "cp '$src' '$dst'"
}

info "Step 3/10 - Deploying domain templates..."
deploy "$SCRIPT_DIR/domain/SOUL.md" "$WORKSPACE_DIR/SOUL.md"
deploy "$SCRIPT_DIR/domain/MEMORY.md" "$WORKSPACE_DIR/MEMORY.md"
deploy "$SCRIPT_DIR/domain/HEARTBEAT.md" "$WORKSPACE_DIR/HEARTBEAT.md"
deploy "$SCRIPT_DIR/domain/context/domain.md" "$WORKSPACE_DIR/context/domain.md"
deploy "$SCRIPT_DIR/domain/context/clients.md" "$WORKSPACE_DIR/context/clients.md"
deploy "$SCRIPT_DIR/domain/openclaw/openclaw.domain.json5" "$WORKSPACE_DIR/openclaw.domain.json5"
deploy "$SCRIPT_DIR/domain/openclaw/.env.example" "$WORKSPACE_DIR/.env.example"
deploy "$SCRIPT_DIR/DOCK.md" "$WORKSPACE_DIR/DOCK.md"

for skill in "$SCRIPT_DIR/domain/skills/"*.md; do
  [[ -f "$skill" ]] && deploy "$skill" "$WORKSPACE_DIR/skills/$(basename "$skill")"
done

info "Step 4/10 - Building routing-first AGENTS.md..."
COMBINED_AGENTS="$WORKSPACE_DIR/AGENTS.md"
if $DRY_RUN; then
  echo "  [dry-run] Would build $COMBINED_AGENTS from global + domain templates"
else
  {
    cat "$SCRIPT_DIR/global/AGENTS.md"
    printf '\n\n---\n\n# Domain: %s\n\n' "$DOMAIN_SLUG"
    cat "$SCRIPT_DIR/domain/AGENTS.md"
  } > "$COMBINED_AGENTS"
fi

subst_file() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  run "sed -i.bak \
    -e 's|{{DOMAIN_NAME}}|$DOMAIN_SLUG|g' \
    -e 's|{{PERSONA_NAME}}|$PERSONA_NAME|g' \
    -e 's|<domain-name>|$DOMAIN_SLUG|g' \
    -e 's|{{HOME}}|$HOME|g' \
    -e 's|{{USER}}|$(whoami)|g' \
    -e 's|{{INSTALL_DATE}}|$INSTALL_DATE|g' \
    -e 's|{{ESTABLISHED_DATE}}|$INSTALL_DATE|g' \
    '$file' && rm -f '${file}.bak'"
}

for f in \
  "$WORKSPACE_DIR/AGENTS.md" \
  "$WORKSPACE_DIR/SOUL.md" \
  "$WORKSPACE_DIR/MEMORY.md" \
  "$WORKSPACE_DIR/HEARTBEAT.md" \
  "$WORKSPACE_DIR/context/domain.md" \
  "$WORKSPACE_DIR/context/clients.md" \
  "$WORKSPACE_DIR/openclaw.domain.json5" \
  "$WORKSPACE_DIR/.env.example" \
  "$WORKSPACE_DIR/DOCK.md"
do
  subst_file "$f"
done

success "AGENTS.md built with global + domain routing layers"

if [[ -n "$INTAKE_JSON" ]]; then
  info "Step 4b - Applying intake to domain templates..."
  if $DRY_RUN; then
    echo -e "  ${YELLOW}[dry-run]${NC} node '$SCRIPT_DIR/scripts/apply-intake.mjs' --intake-json '$INTAKE_JSON' --workspace-dir '$WORKSPACE_DIR'"
  else
    node "$SCRIPT_DIR/scripts/apply-intake.mjs" \
      --intake-json "$INTAKE_JSON" \
      --workspace-dir "$WORKSPACE_DIR" \
      --template-dir "$SCRIPT_DIR"
  fi
fi

info "Step 5/10 - Installing domain-memory plugin template..."
run "mkdir -p '$MEMORY_PLUGIN_DIR'"
run "cp -R '$SCRIPT_DIR/domain/openclaw/plugins/domain-memory/.' '$MEMORY_PLUGIN_DIR/'"

if command -v openclaw &>/dev/null || $DRY_RUN; then
  run "openclaw plugins install -l '$MEMORY_PLUGIN_DIR'" || warn "Plugin link failed - add $MEMORY_PLUGIN_DIR to plugins.load.paths manually"
fi

if $ENABLE_COMMERCE; then
  info "Step 5b - Installing optional domain-commerce plugin template..."
  run "mkdir -p '$COMMERCE_PLUGIN_DIR'"
  run "cp -R '$SCRIPT_DIR/domain/openclaw/plugins/domain-commerce/.' '$COMMERCE_PLUGIN_DIR/'"
  if command -v openclaw &>/dev/null || $DRY_RUN; then
    run "openclaw plugins install -l '$COMMERCE_PLUGIN_DIR'" || warn "Commerce plugin link failed - add $COMMERCE_PLUGIN_DIR to plugins.load.paths manually"
  fi
fi

info "Step 6/10 - Creating workspace env..."
ENV_FILE="$WORKSPACE_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  run "cp '$WORKSPACE_DIR/.env.example' '$ENV_FILE'"
  run "sed -i.bak \
    -e 's|OPENCLAW_DOMAIN_NAME=my-domain|OPENCLAW_DOMAIN_NAME=$DOMAIN_SLUG|g' \
    -e 's|DOMAIN_MEMORY_DB_PATH=~/.openclaw/workspaces/my-domain/memory.db|DOMAIN_MEMORY_DB_PATH=$WORKSPACE_DIR/memory.db|g' \
    -e 's|DOMAIN_MEMORY_PATH=~/.openclaw/workspaces/my-domain/MEMORY.md|DOMAIN_MEMORY_PATH=$WORKSPACE_DIR/MEMORY.md|g' \
    -e 's|DOMAIN_COMMERCE_CATALOG_PATH=~/.openclaw/workspaces/my-domain/commerce-catalog.json|DOMAIN_COMMERCE_CATALOG_PATH=$WORKSPACE_DIR/commerce-catalog.json|g' \
    '$ENV_FILE' && rm -f '${ENV_FILE}.bak'"
  success "Created $ENV_FILE"
else
  info ".env already exists - skipping"
fi

run "echo '$DOMAIN_SLUG' > '$OPENCLAW_HOME/active-domain'"

info "Step 7/10 - Registering OpenClaw agent..."
if command -v openclaw &>/dev/null || $DRY_RUN; then
  run "openclaw agents add '$DOMAIN_SLUG' --workspace '$WORKSPACE_DIR' --non-interactive" || warn "Agent may already exist - check: openclaw agents list"
  run "openclaw agents set-identity --agent '$DOMAIN_SLUG' --from-identity" || warn "Identity sync skipped - fill SOUL.md and run set-identity manually"
fi

info "Step 8/10 - Configuring OpenClaw defaults..."
if command -v openclaw &>/dev/null || $DRY_RUN; then
  run "openclaw config set agents.defaults.model.primary '$MODEL'" || warn "Could not set model default"
  run "openclaw config set agents.defaults.thinkingDefault '$THINKING'" || warn "Could not set thinking default"
  run "openclaw config set agents.defaults.heartbeat.every '$HEARTBEAT_EVERY'" || warn "Could not set heartbeat interval"
  run "openclaw config set agents.defaults.heartbeat.target 'last'" || warn "Could not set heartbeat target"
  run "openclaw config set agents.defaults.heartbeat.isolatedSession true" || warn "Could not set heartbeat isolation"
  run "openclaw config set agents.defaults.heartbeat.prompt 'Read HEARTBEAT.md if it exists. OpenClaw includes only due tasks from its native tasks block; follow those task prompts strictly. Resolve every recurring task through the AGENTS.md routing table before acting. If nothing needs attention, reply HEARTBEAT_OK.'" || warn "Could not set heartbeat prompt"
  run "openclaw config set skills.load.extraDirs '[\"$WORKSPACE_DIR/skills\"]'" || warn "Could not set skills extraDirs"
fi

if $SKIP_GATEWAY; then
  info "Step 8b - Skipping gateway onboarding (--skip-gateway)"
else
  info "Step 8b - Ensuring OpenClaw gateway daemon..."
  run "openclaw onboard --flow quickstart --mode local --install-daemon" || warn "Gateway onboarding failed - run: openclaw onboard --flow quickstart --mode local --install-daemon"
fi

if $SKIP_OLLAMA; then
  info "Step 9/10 - Skipping ollama (--skip-ollama)"
else
  info "Step 9/10 - Ensuring ollama + nomic-embed-text..."
  if ! command -v ollama &>/dev/null; then
    info "Installing ollama..."
    run "curl -fsSL https://ollama.ai/install.sh | sh"
  else
    info "ollama: found"
  fi
  run "ollama pull nomic-embed-text" || warn "ollama pull failed - FTS recall still works; vector recall requires nomic-embed-text"
fi

info "Step 10/10 - Creating persona shell alias '$PERSONA_SLUG'..."

if [[ -f "$HOME/.zshrc" ]]; then
  SHELL_RC="$HOME/.zshrc"
elif [[ -f "$HOME/.bashrc" ]]; then
  SHELL_RC="$HOME/.bashrc"
else
  SHELL_RC="$HOME/.profile"
fi

ALIAS_COMMENT="# OpenClaw persona alias: $PERSONA_NAME - added by install.sh ($INSTALL_DATE)"
ALIAS_LINE="alias ${PERSONA_SLUG}='openclaw agent --agent ${DOMAIN_SLUG} --message'"

if ! grep -qF "alias ${PERSONA_SLUG}=" "$SHELL_RC" 2>/dev/null; then
  run "printf '\n%s\n%s\n' '$ALIAS_COMMENT' \"$ALIAS_LINE\" >> '$SHELL_RC'"
  success "Added alias '$PERSONA_SLUG' to $SHELL_RC"
  warn "Run 'source $SHELL_RC' or open a new terminal to activate it"
else
  info "Alias '$PERSONA_SLUG' already exists in $SHELL_RC"
fi

if [[ -n "$PROJECT_DIR" ]]; then
  info "Step 11/11 - Creating/filling project repo from base template..."
  if $DRY_RUN; then
    echo -e "  ${YELLOW}[dry-run]${NC} Would create/fill project at $PROJECT_DIR"
  else
    if [[ ! -d "$PROJECT_DIR" ]]; then
      mkdir -p "$(dirname "$PROJECT_DIR")"
      cp -R "$SCRIPT_DIR/base" "$PROJECT_DIR"
      ( cd "$PROJECT_DIR" && git init -q )
    fi
    mkdir -p "$PROJECT_DIR/context" "$PROJECT_DIR/memory" "$PROJECT_DIR/workspaces"
    if [[ -n "$INTAKE_JSON" ]]; then
      node "$SCRIPT_DIR/scripts/apply-intake.mjs" \
        --intake-json "$INTAKE_JSON" \
        --workspace-dir "$WORKSPACE_DIR" \
        --project-dir "$PROJECT_DIR" \
        --template-dir "$SCRIPT_DIR"
    else
      cp -R "$SCRIPT_DIR/base/." "$PROJECT_DIR/"
    fi
    rm -rf "$PROJECT_DIR/workspaces/example-workspace-1" "$PROJECT_DIR/workspaces/example-workspace-2"
  fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
success "Installation complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Workspace:      $WORKSPACE_DIR"
echo "  Active domain:  $OPENCLAW_HOME/active-domain -> $DOMAIN_SLUG"
echo "  Memory DB:      $WORKSPACE_DIR/memory.db (created by domain-memory tools)"
echo "  Memory plugin:  $MEMORY_PLUGIN_DIR"
if $ENABLE_COMMERCE; then
  echo "  Commerce plugin:$COMMERCE_PLUGIN_DIR"
fi
echo ""
echo "  Start a local turn:"
echo "    openclaw agent --agent $DOMAIN_SLUG --message \"status\" --local"
echo ""
echo "  Use persona alias:"
echo "    $PERSONA_SLUG \"summarize active work\""
echo ""
echo "  Files that still need worker-specific content:"
echo "    $WORKSPACE_DIR/AGENTS.md"
echo "    $WORKSPACE_DIR/SOUL.md"
echo "    $WORKSPACE_DIR/context/domain.md"
echo "    $WORKSPACE_DIR/DOCK.md"
echo ""
if [[ -n "$PROJECT_DIR" ]]; then
  echo "  Project:         $PROJECT_DIR"
  echo "  Checklist:       $PROJECT_DIR/POST-INSTALL-CHECKLIST.md"
else
  echo "  Project setup:"
  echo "    Run with --project-dir <path> or copy base/ into the project root."
  echo "    Copy base/openclaw/.env.example to a project env source and set PROJECT_ID."
fi
echo ""
echo "  Heartbeat owns recurring work:"
echo "    Edit $WORKSPACE_DIR/HEARTBEAT.md; do not create watches.yaml or scheduler jobs."
echo ""
