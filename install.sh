#!/usr/bin/env bash
# install.sh — MASTER-claude-pi-template v2 installer
#
# Sets up a pi domain on this machine:
#   1. Checks prerequisites (pi, node, ollama)
#   2. Creates domain directory at ~/.pi/domain/<domain-name>/
#   3. Deploys domain templates (AGENTS.md, SOUL.md, watches.yaml, memory extension)
#   4. Deploys global AGENTS.md to ~/.pi/agent/
#   5. Deploys PI_DOCK.md to ~/.pi/
#   6. Writes ~/.pi/active-domain pointer file
#   7. Pulls nomic-embed-text via ollama (unless --skip-ollama)
#   8. Creates persona CLI alias in shell RC file
#   9. Installs OS scheduler for watches (unless --skip-scheduler)
#  10. Prints next steps
#
# Usage:
#   ./install.sh --domain <name> --persona <name> [options]
#
# Options:
#   --domain <name>      Domain directory name under ~/.pi/domain/ (required)
#   --persona <name>     Persona name; creates CLI alias (required)
#   --skip-ollama        Skip ollama install and model pull
#   --skip-scheduler     Skip launchd/systemd scheduler setup
#   --yes                Skip confirmation prompts
#   --dry-run            Print what would happen without executing

set -euo pipefail

# ─── colors ───────────────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

info()    { echo -e "${BLUE}[install]${NC} $*"; }
success() { echo -e "${GREEN}[install]${NC} $*"; }
warn()    { echo -e "${YELLOW}[warn]${NC}    $*"; }
error()   { echo -e "${RED}[error]${NC}   $*" >&2; }
die()     { error "$*"; exit 1; }

# ─── argument parsing ─────────────────────────────────────────────────────────

DOMAIN_NAME=""
PERSONA_NAME=""
SKIP_OLLAMA=false
SKIP_SCHEDULER=false
YES=false
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --domain)    DOMAIN_NAME="$2"; shift 2 ;;
    --persona)   PERSONA_NAME="$2"; shift 2 ;;
    --skip-ollama)    SKIP_OLLAMA=true; shift ;;
    --skip-scheduler) SKIP_SCHEDULER=true; shift ;;
    --yes)       YES=true; shift ;;
    --dry-run)   DRY_RUN=true; shift ;;
    *) die "Unknown argument: $1" ;;
  esac
done

[[ -z "$DOMAIN_NAME" ]] && {
  read -rp "Domain name (e.g. gtm-strategy, research, ops): " DOMAIN_NAME
}
[[ -z "$PERSONA_NAME" ]] && {
  read -rp "Persona name (e.g. Kai, Morgan, Ash): " PERSONA_NAME
}

[[ -z "$DOMAIN_NAME" ]] && die "--domain is required"
[[ -z "$PERSONA_NAME" ]] && die "--persona is required"

# Sanitize: lowercase, hyphens only
DOMAIN_SLUG="$(echo "$DOMAIN_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')"
PERSONA_SLUG="$(echo "$PERSONA_NAME" | tr '[:upper:]' '[:lower:]' | tr ' ' '-' | tr -cd '[:alnum:]-')"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PI_HOME="$HOME/.pi"
DOMAIN_DIR="$PI_HOME/domain/$DOMAIN_SLUG"
AGENT_DIR="$PI_HOME/agent"
LOG_DIR="$PI_HOME/logs"
INSTALL_DATE="$(date '+%Y-%m-%d')"
OS="$(uname -s)"

# ─── dry-run wrapper ──────────────────────────────────────────────────────────

run() {
  if $DRY_RUN; then
    echo -e "  ${YELLOW}[dry-run]${NC} $*"
  else
    eval "$@"
  fi
}

# ─── summary ──────────────────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Pi Domain Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Domain:  $DOMAIN_SLUG"
echo "  Persona: $PERSONA_NAME ($PERSONA_SLUG)"
echo "  Target:  $DOMAIN_DIR"
echo "  Ollama:  $(if $SKIP_OLLAMA; then echo 'skip'; else echo 'install nomic-embed-text'; fi)"
echo "  Sched:   $(if $SKIP_SCHEDULER; then echo 'skip'; else echo "$OS scheduler"; fi)"
$DRY_RUN && echo "  Mode:    DRY RUN — no changes will be made"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if ! $YES && ! $DRY_RUN; then
  read -rp "Proceed? [y/N] " confirm
  [[ "$confirm" =~ ^[Yy]$ ]] || { info "Aborted."; exit 0; }
fi

# ─── step 1: prerequisite checks ──────────────────────────────────────────────

info "Step 1/10 — Checking prerequisites..."

# pi
if ! command -v pi &>/dev/null; then
  warn "pi not found. Installing @mariozechner/pi-coding-agent..."
  run "npm install -g @mariozechner/pi-coding-agent"
else
  info "pi: $(pi --version 2>/dev/null || echo 'found')"
fi

# node
command -v node &>/dev/null || die "node not found. Install Node.js 18+ before continuing."
info "node: $(node --version)"

# npm packages for memory-db extension
info "Installing npm packages for memory-db extension..."
run "npm install -g better-sqlite3 sqlite-vec" || warn "npm install failed — memory-db extension may not work until packages are installed"

# ─── step 2: directory setup ──────────────────────────────────────────────────

info "Step 2/10 — Creating directory structure..."
run "mkdir -p '$DOMAIN_DIR/skills' '$DOMAIN_DIR/context' '$DOMAIN_DIR/.pi/extensions' '$AGENT_DIR' '$LOG_DIR'"

# ─── step 3: deploy templates ─────────────────────────────────────────────────

info "Step 3/10 — Deploying domain templates..."

deploy() {
  local src="$1" dst="$2"
  if [[ -f "$dst" ]] && ! $YES; then
    read -rp "  $dst exists. Overwrite? [y/N] " ow
    [[ "$ow" =~ ^[Yy]$ ]] || { warn "Skipping $dst"; return; }
  fi
  run "cp '$src' '$dst'"
}

deploy "$SCRIPT_DIR/domain/AGENTS.md"        "$DOMAIN_DIR/AGENTS.md"
deploy "$SCRIPT_DIR/domain/SOUL.md"          "$DOMAIN_DIR/SOUL.md"
deploy "$SCRIPT_DIR/domain/MEMORY.md"        "$DOMAIN_DIR/MEMORY.md"
deploy "$SCRIPT_DIR/domain/watches.yaml"     "$DOMAIN_DIR/watches.yaml"
deploy "$SCRIPT_DIR/domain/context/domain.md"   "$DOMAIN_DIR/context/domain.md"
deploy "$SCRIPT_DIR/domain/context/clients.md"  "$DOMAIN_DIR/context/clients.md"
deploy "$SCRIPT_DIR/domain/.pi/settings.json"          "$DOMAIN_DIR/.pi/settings.json"
deploy "$SCRIPT_DIR/domain/.pi/extensions/memory-db.ts" "$DOMAIN_DIR/.pi/extensions/memory-db.ts"
deploy "$SCRIPT_DIR/domain/.pi/extensions/.env.example" "$DOMAIN_DIR/.pi/extensions/.env.example"

# Copy domain skills if any exist (skip .gitkeep)
for skill in "$SCRIPT_DIR/domain/skills/"*.md; do
  [[ -f "$skill" ]] && deploy "$skill" "$DOMAIN_DIR/skills/$(basename "$skill")"
done

# Deploy global AGENTS.md
deploy "$SCRIPT_DIR/global/AGENTS.md" "$AGENT_DIR/AGENTS.md"

# Deploy PI_DOCK.md
deploy "$SCRIPT_DIR/PI_DOCK.md" "$PI_HOME/PI_DOCK.md"

# ─── step 4: substitute placeholders ──────────────────────────────────────────

info "Step 4/10 — Substituting placeholders in deployed files..."

subst_file() {
  local file="$1"
  [[ -f "$file" ]] || return
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
  "$DOMAIN_DIR/AGENTS.md" \
  "$DOMAIN_DIR/SOUL.md" \
  "$DOMAIN_DIR/MEMORY.md" \
  "$DOMAIN_DIR/context/domain.md" \
  "$DOMAIN_DIR/context/clients.md" \
  "$DOMAIN_DIR/.pi/settings.json" \
  "$PI_HOME/PI_DOCK.md"
do
  subst_file "$f"
done

# ─── step 5: .pi/.env for memory-db ───────────────────────────────────────────

info "Step 5/10 — Creating domain .env file..."

ENV_FILE="$DOMAIN_DIR/.pi/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  run "cat > '$ENV_FILE' << 'ENVEOF'
PI_DOMAIN_NAME=$DOMAIN_SLUG
PI_MEMORY_TOKEN_BUDGET=16000
PI_MEMORY_TOP_N=10
OLLAMA_URL=http://localhost:11434
PI_MEMORY_SYNC_MD=false
PI_MEMORY_AUTO_CAPTURE=true
ENVEOF"
  success "Created $ENV_FILE"
else
  info ".env already exists — skipping"
fi

# ─── step 6: active-domain pointer ────────────────────────────────────────────

info "Step 6/10 — Writing active-domain pointer..."
run "echo '$DOMAIN_SLUG' > '$PI_HOME/active-domain'"
success "Active domain set to: $DOMAIN_SLUG"

# ─── step 7: memory.db note ───────────────────────────────────────────────────

info "Step 7/10 — Memory DB path..."
info "memory.db will be created at: $DOMAIN_DIR/memory.db"
info "(Created automatically on first pi session start via memory-db extension)"

# ─── step 8: ollama + nomic-embed-text ────────────────────────────────────────

if $SKIP_OLLAMA; then
  info "Step 8/10 — Skipping ollama (--skip-ollama)"
else
  info "Step 8/10 — Ensuring ollama + nomic-embed-text..."

  if ! command -v ollama &>/dev/null; then
    info "Installing ollama..."
    run "curl -fsSL https://ollama.ai/install.sh | sh"
  else
    info "ollama: found"
  fi

  info "Pulling nomic-embed-text (this may take a few minutes on first run)..."
  run "ollama pull nomic-embed-text" || warn "ollama pull failed — FTS recall will still work; vector recall requires nomic-embed-text"
fi

# ─── step 9: persona CLI alias ────────────────────────────────────────────────

info "Step 9/10 — Creating persona CLI alias '$PERSONA_SLUG'..."

ALIAS_LINE="alias $PERSONA_SLUG='PI_DOMAIN_NAME=$DOMAIN_SLUG pi'"
ALIAS_COMMENT="# Pi persona alias: $PERSONA_NAME — added by install.sh ($INSTALL_DATE)"

# Detect shell RC file
if [[ -f "$HOME/.zshrc" ]]; then
  SHELL_RC="$HOME/.zshrc"
elif [[ -f "$HOME/.bashrc" ]]; then
  SHELL_RC="$HOME/.bashrc"
else
  SHELL_RC="$HOME/.profile"
fi

if ! grep -qF "$ALIAS_LINE" "$SHELL_RC" 2>/dev/null; then
  run "{ echo ''; echo '$ALIAS_COMMENT'; echo \"$ALIAS_LINE\"; } >> '$SHELL_RC'"
  success "Added alias '$PERSONA_SLUG' to $SHELL_RC"
  warn "Run 'source $SHELL_RC' or open a new terminal to activate the alias"
else
  info "Alias '$PERSONA_SLUG' already in $SHELL_RC"
fi

# ─── step 10: OS scheduler ────────────────────────────────────────────────────

if $SKIP_SCHEDULER; then
  info "Step 10/10 — Skipping scheduler (--skip-scheduler)"
else
  info "Step 10/10 — Installing OS scheduler for watches..."

  PI_BIN="$(command -v pi 2>/dev/null || echo '/usr/local/bin/pi')"
  WATCHES_PATH="$DOMAIN_DIR/watches.yaml"
  PATH_VALUE="$PATH"

  if [[ "$OS" == "Darwin" ]]; then
    PLIST_SRC="$SCRIPT_DIR/scheduler/launchd/com.pi.domain.watches.plist"
    PLIST_DEST="$HOME/Library/LaunchAgents/com.pi.domain.$DOMAIN_SLUG.watches.plist"

    run "mkdir -p '$HOME/Library/LaunchAgents'"
    run "sed \
      -e 's|{{DOMAIN_NAME}}|$DOMAIN_SLUG|g' \
      -e 's|{{PI_BIN}}|$PI_BIN|g' \
      -e 's|{{WATCHES_PATH}}|$WATCHES_PATH|g' \
      -e 's|{{LOG_DIR}}|$LOG_DIR|g' \
      -e 's|{{HOME}}|$HOME|g' \
      -e 's|{{PATH}}|$PATH_VALUE|g' \
      '$PLIST_SRC' > '$PLIST_DEST'"

    run "launchctl load '$PLIST_DEST'" || warn "launchctl load failed — run manually: launchctl load $PLIST_DEST"
    success "launchd job loaded: com.pi.domain.$DOMAIN_SLUG.watches"

  elif [[ "$OS" == "Linux" ]]; then
    SYSTEMD_DIR="$HOME/.config/systemd/user"
    SVC_NAME="pi-domain-$DOMAIN_SLUG-watches"

    run "mkdir -p '$SYSTEMD_DIR'"

    run "sed \
      -e 's|{{DOMAIN_NAME}}|$DOMAIN_SLUG|g' \
      -e 's|{{PI_BIN}}|$PI_BIN|g' \
      -e 's|{{WATCHES_PATH}}|$WATCHES_PATH|g' \
      -e 's|{{LOG_DIR}}|$LOG_DIR|g' \
      -e 's|{{HOME}}|$HOME|g' \
      -e 's|{{USER}}|$(whoami)|g' \
      '$SCRIPT_DIR/scheduler/systemd/pi-domain-watches.service' > '$SYSTEMD_DIR/$SVC_NAME.service'"

    run "sed \
      -e 's|{{DOMAIN_NAME}}|$DOMAIN_SLUG|g' \
      '$SCRIPT_DIR/scheduler/systemd/pi-domain-watches.timer' > '$SYSTEMD_DIR/$SVC_NAME.timer'"

    run "systemctl --user daemon-reload"
    run "systemctl --user enable --now '$SVC_NAME.timer'" || warn "systemctl enable failed — run manually: systemctl --user enable --now $SVC_NAME.timer"
    success "systemd timer enabled: $SVC_NAME.timer"

  else
    warn "Unsupported OS for scheduler setup: $OS. Install manually using templates in scheduler/"
  fi
fi

# ─── done ─────────────────────────────────────────────────────────────────────

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
success "Installation complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "  Domain:         $DOMAIN_DIR"
echo "  Active domain:  $PI_HOME/active-domain → $DOMAIN_SLUG"
echo "  Memory DB:      $DOMAIN_DIR/memory.db (created on first session)"
echo "  Logs:           $LOG_DIR/pi-watches.log"
echo ""
echo "  To start a session:"
echo "    $PERSONA_SLUG         (after sourcing your shell RC)"
echo "    PI_DOMAIN_NAME=$DOMAIN_SLUG pi   (without alias)"
echo ""
echo "  Files that still need your content:"
echo "    $DOMAIN_DIR/AGENTS.md      — fill in domain identity, vocabulary, methods"
echo "    $DOMAIN_DIR/SOUL.md        — fill in persona voice, identity, relationship"
echo "    $DOMAIN_DIR/context/domain.md — fill in what this domain is and does"
echo "    $PI_HOME/PI_DOCK.md        — fill in carried items and host requirements"
echo ""
echo "  Per project — add to <project-root>/.pi/.env:"
echo "    PI_PROJECT_ID=<project-slug>"
echo ""
echo "  Delete all annotation comments from template files before going live."
echo ""
