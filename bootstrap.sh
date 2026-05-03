#!/usr/bin/env bash
# Location-independent bootstrap for public testing.
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/kevindelta/MASTER-claude-pi-template/main/bootstrap.sh | bash
#   curl -fsSL https://raw.githubusercontent.com/kevindelta/MASTER-claude-pi-template/main/bootstrap.sh | bash -s -- --open

set -euo pipefail

REPO_URL="${OPENCLAW_TEMPLATE_REPO_URL:-https://github.com/kevindelta/MASTER-claude-pi-template.git}"
BRANCH="${OPENCLAW_TEMPLATE_BRANCH:-main}"
INSTALL_DIR="${OPENCLAW_TEMPLATE_DIR:-$HOME/.openclaw/templates/master-agent-template}"
RUN_SMOKE=true
OPEN_WIZARD=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo)
      REPO_URL="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --dir)
      INSTALL_DIR="$2"
      shift 2
      ;;
    --skip-smoke)
      RUN_SMOKE=false
      shift
      ;;
    --open)
      OPEN_WIZARD=true
      shift
      ;;
    -h|--help)
      cat <<'USAGE'
Location-independent bootstrap for public testing.

Usage:
  curl -fsSL https://raw.githubusercontent.com/kevindelta/MASTER-claude-pi-template/main/bootstrap.sh | bash
  curl -fsSL https://raw.githubusercontent.com/kevindelta/MASTER-claude-pi-template/main/bootstrap.sh | bash -s -- --open

Options:
  --repo <url>       Git repository URL to clone.
  --branch <name>    Branch to install. Default: main.
  --dir <path>       Install directory. Default: ~/.openclaw/templates/master-agent-template.
  --skip-smoke       Skip install.sh dry-run smoke check.
  --open             Open the onboarding wizard on macOS after install.
USAGE
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

info() { printf '\033[0;34m[bootstrap]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[warn]\033[0m %s\n' "$*"; }
die() { printf '\033[0;31m[error]\033[0m %s\n' "$*" >&2; exit 1; }

command -v git >/dev/null 2>&1 || die "git is required for the current testing bootstrap."

if ! command -v node >/dev/null 2>&1; then
  warn "node was not found. install.sh will stop until Node.js is installed."
fi

if ! command -v openclaw >/dev/null 2>&1; then
  warn "openclaw was not found. install.sh can install it with npm during real setup."
fi

mkdir -p "$(dirname "$INSTALL_DIR")"

if [[ -d "$INSTALL_DIR/.git" ]]; then
  info "Updating existing template at $INSTALL_DIR"
  if [[ -n "$(git -C "$INSTALL_DIR" status --porcelain)" ]]; then
    die "Template checkout has local changes. Resolve them or set OPENCLAW_TEMPLATE_DIR to a fresh path."
  fi
  git -C "$INSTALL_DIR" remote set-url origin "$REPO_URL"
  git -C "$INSTALL_DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$INSTALL_DIR" checkout "$BRANCH"
  git -C "$INSTALL_DIR" reset --hard "origin/$BRANCH"
elif [[ -e "$INSTALL_DIR" ]]; then
  die "$INSTALL_DIR exists but is not a git checkout. Move it or pass --dir /new/path."
else
  info "Cloning template into $INSTALL_DIR"
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
fi

chmod +x "$INSTALL_DIR/install.sh" || true

if [[ "$RUN_SMOKE" == true ]]; then
  info "Running dry-run smoke check"
  (
    cd "$INSTALL_DIR"
    ./install.sh --domain bootstrap-smoke --persona Nova --dry-run --skip-gateway --skip-ollama --yes
  )
fi

WIZARD="$INSTALL_DIR/Intake-mapping/wyndelta-onboarding.html"

echo
info "Template ready: $INSTALL_DIR"

if [[ -f "$WIZARD" ]]; then
  info "Onboarding wizard:"
  echo "  $WIZARD"
  echo
  echo "Next:"
  echo "  cd \"$INSTALL_DIR\""
  echo "  open Intake-mapping/wyndelta-onboarding.html"
  echo
  echo "After the wizard generates a bundle:"
  echo "  bash setup-client.sh"
else
  warn "Onboarding wizard not found at $WIZARD"
  warn "Make sure Intake-mapping/wyndelta-onboarding.html is tracked in the public repo."
fi

if [[ "$OPEN_WIZARD" == true ]]; then
  if command -v open >/dev/null 2>&1 && [[ -f "$WIZARD" ]]; then
    open "$WIZARD"
  else
    warn "--open requested, but this system cannot open the wizard automatically."
  fi
fi
