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
#   ENV        : environment (local|staging|prod). If not set, auto-detects from:
#                 - Hostname (staging/defigo → staging, prod/soahospitals → prod)
#                 - Git branch (staging → staging, main/master → prod, dev → local)
#                 - TARGET_DIR path (if contains staging/prod)
#                 - Environment marker files (.env.staging, .env.prod, .env.local)
#                 If auto-detection fails and .env exists, preserves it. Otherwise defaults to prod.

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

# Handle environment-specific .env file
ENV_FILE="$WORK_DIR/.env"

# Auto-detect environment if not explicitly set
if [[ -z "${ENV:-}" ]]; then
  echo "🔍 Auto-detecting deployment environment..."

  # Method 1: Check hostname (most reliable for server deployments)
  HOSTNAME=$(hostname 2>/dev/null || echo "")
  if [[ -n "$HOSTNAME" ]]; then
    if [[ "$HOSTNAME" == *"staging"* ]] || [[ "$HOSTNAME" == *"stage"* ]] || [[ "$HOSTNAME" == *"defigo"* ]]; then
      ENV="staging"
      echo "  ✓ Detected: staging (hostname: $HOSTNAME)"
    elif [[ "$HOSTNAME" == *"prod"* ]] || [[ "$HOSTNAME" == *"production"* ]] || [[ "$HOSTNAME" == *"soahospitals"* ]]; then
      ENV="prod"
      echo "  ✓ Detected: prod (hostname: $HOSTNAME)"
    elif [[ "$HOSTNAME" == *"local"* ]] || [[ "$HOSTNAME" == "localhost" ]]; then
      ENV="local"
      echo "  ✓ Detected: local (hostname: $HOSTNAME)"
    fi
  fi

  # Method 2: Check git branch (useful for CI/CD)
  if [[ -z "${ENV:-}" ]] && [[ -d "$WORK_DIR/.git" ]]; then
    BRANCH_NAME=$(git -C "$WORK_DIR" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
    if [[ -n "$BRANCH_NAME" ]]; then
      if [[ "$BRANCH_NAME" == *"staging"* ]] || [[ "$BRANCH_NAME" == *"stage"* ]]; then
        ENV="staging"
        echo "  ✓ Detected: staging (branch: $BRANCH_NAME)"
      elif [[ "$BRANCH_NAME" == *"prod"* ]] || [[ "$BRANCH_NAME" == *"production"* ]] || [[ "$BRANCH_NAME" == "main" ]] || [[ "$BRANCH_NAME" == "master" ]]; then
        ENV="prod"
        echo "  ✓ Detected: prod (branch: $BRANCH_NAME)"
      elif [[ "$BRANCH_NAME" == *"local"* ]] || [[ "$BRANCH_NAME" == *"dev"* ]] || [[ "$BRANCH_NAME" == "develop" ]]; then
        ENV="local"
        echo "  ✓ Detected: local (branch: $BRANCH_NAME)"
      fi
    fi
  fi

  # Method 3: Check TARGET_DIR path for environment hints
  if [[ -z "${ENV:-}" ]] && [[ -n "$TARGET_DIR" ]]; then
    if [[ "$TARGET_DIR" == *"staging"* ]] || [[ "$TARGET_DIR" == *"stage"* ]]; then
      ENV="staging"
      echo "  ✓ Detected: staging (target directory: $TARGET_DIR)"
    elif [[ "$TARGET_DIR" == *"prod"* ]] || [[ "$TARGET_DIR" == *"production"* ]]; then
      ENV="prod"
      echo "  ✓ Detected: prod (target directory: $TARGET_DIR)"
    fi
  fi

  # Method 4: Check for environment marker files
  if [[ -z "${ENV:-}" ]]; then
    if [[ -f "$WORK_DIR/.env.staging" ]] || [[ -f "$SCRIPT_DIR/.env.staging" ]]; then
      ENV="staging"
      echo "  ✓ Detected: staging (found .env.staging file)"
    elif [[ -f "$WORK_DIR/.env.prod" ]] || [[ -f "$SCRIPT_DIR/.env.prod" ]]; then
      ENV="prod"
      echo "  ✓ Detected: prod (found .env.prod file)"
    elif [[ -f "$WORK_DIR/.env.local" ]] || [[ -f "$SCRIPT_DIR/.env.local" ]]; then
      ENV="local"
      echo "  ✓ Detected: local (found .env.local file)"
    fi
  fi
fi

# If still not set, handle gracefully
if [[ -z "${ENV:-}" ]]; then
  if [[ -f "$ENV_FILE" ]]; then
    echo "  ⚠️  Auto-detection failed. Preserving existing .env file."
    echo "     To set explicitly: ENV=local|staging|prod ./deploy.sh"
  else
    echo "  ⚠️  Auto-detection failed and no .env file found."
    echo "     Defaulting to production. To override: ENV=local|staging|prod ./deploy.sh"
    ENV="prod"
  fi
else
  echo "  → Using environment: $ENV"
fi

if [[ -n "${ENV:-}" ]]; then
  echo ""
  echo "📝 Configuring .env for $ENV environment..."

  case "$ENV" in
    local)
      API_URL="http://localhost:4000/api/admin"
      SOCKET_URL="http://localhost:4000"
      ;;
    staging)
      API_URL="https://sumum.defigo.in/api/admin"
      SOCKET_URL="https://sumum.defigo.in"
      ;;
    prod|production)
      API_URL="https://sumumapp.soahospitals.com/api/admin"
      SOCKET_URL="https://sumumapp.soahospitals.com"
      ;;
    *)
      echo "ERROR: Invalid ENV value '$ENV'. Must be one of: local, staging, prod" >&2
      exit 1
      ;;
  esac

  if [[ -f "$ENV_FILE" ]]; then
    echo "Updating .env for $ENV environment..."
  else
    echo "Creating .env for $ENV environment..."
  fi

  cat > "$ENV_FILE" <<EOF
VITE_API_URL=${API_URL}
VITE_SOCKET_URL=${SOCKET_URL}
EOF
  echo "✓ .env configured for $ENV environment"
else
  if [[ -f "$ENV_FILE" ]]; then
    echo "Preserving existing .env file (ENV not specified)"
  else
    echo "WARNING: No .env file found and ENV not specified. Creating default (production) .env..."
    cat > "$ENV_FILE" <<'EOF'
VITE_API_URL=https://sumumapp.soahospitals.com/api/admin
VITE_SOCKET_URL=https://sumumapp.soahospitals.com
EOF
  fi
fi

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
