#!/usr/bin/env bash
set -euo pipefail

# Deploy script for SUM_admin (React app)
# - Uses existing repo (pull latest) or clones if absent
# - Installs dependencies
# - Builds the app
# - Syncs the built files to ../frontend_app
#
# Optional env vars:
#   REPO_URL   : repo to use (default: https://github.com/asisshhh/SUM_admin.git)
#   BRANCH     : branch to deploy (default: main)
#   TARGET_DIR : destination for built assets (default: ../frontend_app)
#   USE_LOCAL  : true/false. If true (default), use current dir repo and pull. If false, fresh clone to temp dir.
#   AUTO_STASH : true/false. If true (default), stash local changes before pull to avoid conflicts (stash kept).

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_URL="${REPO_URL:-https://github.com/asisshhh/SUM_admin.git}"
BRANCH="${BRANCH:-main}"
TARGET_DIR="${TARGET_DIR:-$SCRIPT_DIR/../frontend_app}"

if [[ -z "$REPO_URL" ]]; then
  echo "ERROR: REPO_URL is not set." >&2
  exit 1
fi

WORK_DIR="$SCRIPT_DIR"
if [[ "${USE_LOCAL:-true}" != "true" ]]; then
  CLONE_DIR="$(mktemp -d "$SCRIPT_DIR/deploy_clone_XXXX")"
  cleanup() { rm -rf "$CLONE_DIR"; }
  trap cleanup EXIT
  WORK_DIR="$CLONE_DIR"
  echo "Fresh clone to $WORK_DIR (branch: $BRANCH)"
  git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$WORK_DIR"
else
  if [[ -d "$WORK_DIR/.git" ]]; then
    echo "Using existing repo at $WORK_DIR (branch: $BRANCH); pulling latest..."
    # Auto-stash local changes to avoid merge conflicts
    if [[ "${AUTO_STASH:-true}" == "true" ]]; then
      if ! git -C "$WORK_DIR" diff --quiet || ! git -C "$WORK_DIR" diff --cached --quiet; then
        STASH_MSG="deploy-$(date +%Y%m%d%H%M%S)"
        echo "Local changes detected. Stashing with message: $STASH_MSG"
        git -C "$WORK_DIR" stash push --include-untracked -m "$STASH_MSG" || true
      fi
    fi
    git -C "$WORK_DIR" fetch origin "$BRANCH"
    git -C "$WORK_DIR" checkout "$BRANCH"
    git -C "$WORK_DIR" pull --ff-only origin "$BRANCH"
  else
    echo "No local repo found; cloning to $WORK_DIR"
    git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$WORK_DIR"
  fi
fi

ENV_FILE="$WORK_DIR/.env"
if [[ -f "$ENV_FILE" ]]; then
  echo "Updating existing .env..."
else
  echo "Creating .env..."
fi
cat > "$ENV_FILE" <<'EOF'
VITE_API_URL=https://sumumapp.soahospitals.com/api/admin
VITE_SOCKET_URL=https://sumumapp.soahospitals.com
EOF

echo "Installing dependencies..."
cd "$WORK_DIR"
if command -v npm >/dev/null 2>&1; then
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
else
  echo "ERROR: npm not found in PATH." >&2
  exit 1
fi

echo "Building app..."
npm run build

echo "Preparing target directory: $TARGET_DIR"
mkdir -p "$TARGET_DIR"

echo "Checking write access to $TARGET_DIR"
if ! touch "$TARGET_DIR/.deploy_write_test" 2>/dev/null; then
  echo "ERROR: No write permission to $TARGET_DIR. Please adjust ownership/permissions or run with sudo." >&2
  exit 1
fi
rm -f "$TARGET_DIR/.deploy_write_test" || true

echo "Syncing build artifacts to $TARGET_DIR"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude '.DS_Store' "$WORK_DIR/dist/" "$TARGET_DIR/"
else
  echo "rsync not found; using cp fallback (clearing target first)"
  rm -rf "$TARGET_DIR"/*
  cp -a "$WORK_DIR/dist/." "$TARGET_DIR/"
fi

echo "Deploy completed."
