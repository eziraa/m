#!/usr/bin/env bash
set -Eeuo pipefail

# Usage:
#   ./deploy.sh
# Optional env vars:
#   BRANCH=main
#   REMOTE=origin
#   APP_DIR=/root/m/backend
#   PM2_APP_NAME=agent-bingo-backend
#   SYSTEMD_SERVICE=agent-bingo-backend.service
#   RUN_MIGRATIONS=1
#   CLEAN_DEPS=1
#   START_CMD="npm start"

BRANCH="${BRANCH:-}"
REMOTE="${REMOTE:-origin}"
APP_DIR="${APP_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-0}"
CLEAN_DEPS="${CLEAN_DEPS:-1}"
PM2_APP_NAME="${PM2_APP_NAME:-}"
SYSTEMD_SERVICE="${SYSTEMD_SERVICE:-}"
START_CMD="${START_CMD:-npm start}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

die() {
  log "ERROR: $*"
  exit 1
}

command -v git >/dev/null 2>&1 || die "git is required"
command -v node >/dev/null 2>&1 || die "node is required"
command -v npm >/dev/null 2>&1 || die "npm is required"

cd "$APP_DIR"

[ -d .git ] || die "${APP_DIR} is not a git repository"

if [ -z "$BRANCH" ]; then
  BRANCH="$(git rev-parse --abbrev-ref HEAD)"
fi

log "Deploying branch '$BRANCH' from remote '$REMOTE' in '$APP_DIR'"

log "Fetching latest changes"
git fetch "$REMOTE" "$BRANCH"

log "Checking out branch '$BRANCH'"
git checkout "$BRANCH"

log "Pulling latest commit"
git pull --rebase --autostash "$REMOTE" "$BRANCH"

if [ "$CLEAN_DEPS" = "1" ]; then
  log "Removing existing dependencies for clean install"
  rm -rf node_modules
fi

log "Installing dependencies"
if [ -f package-lock.json ]; then
  npm ci
elif [ -f pnpm-lock.yaml ] && command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
else
  npm install
fi

log "Building app"
npm run build

if [ "$RUN_MIGRATIONS" = "1" ]; then
  log "Running database migrations (db:push)"
  npm run db:push
fi

restart_with_pm2() {
  if ! command -v pm2 >/dev/null 2>&1; then
    return 1
  fi

  local app_name="$PM2_APP_NAME"
  if [ -z "$app_name" ]; then
    for candidate in mella-bingo "$(basename "$APP_DIR")" mella-bingo-back mella-bingo-backend; do
      if pm2 describe "$candidate" >/dev/null 2>&1; then
        app_name="$candidate"
        break
      fi
    done
  fi

  if [ -z "$app_name" ]; then
    app_name="$(basename "$APP_DIR")"
  fi

  # Remove duplicate legacy app names so only one backend process remains.
  for alias in mella-bingo mella-bingo-back mella-bingo-backend "$(basename "$APP_DIR")"; do
    if [ "$alias" != "$app_name" ] && pm2 describe "$alias" >/dev/null 2>&1; then
      log "Removing duplicate PM2 app '$alias'"
      pm2 delete "$alias" >/dev/null 2>&1 || true
    fi
  done

  if pm2 describe "$app_name" >/dev/null 2>&1; then
    log "Recreating PM2 app '$app_name' from '$APP_DIR' to avoid stale process config"
    pm2 delete "$app_name" >/dev/null 2>&1 || true
  else
    log "Starting PM2 app '$app_name'"
  fi

  pm2 start npm --name "$app_name" --cwd "$APP_DIR" -- start

  pm2 save >/dev/null 2>&1 || true
  return 0
}

restart_with_systemd() {
  local svc="$SYSTEMD_SERVICE"
  if [ -z "$svc" ]; then
    for candidate in mella-bingo.service mella-bingo-back.service bingo-backend.service; do
      if systemctl list-unit-files --type=service | awk '{print $1}' | grep -qx "$candidate"; then
        svc="$candidate"
        break
      fi
    done
  fi

  if [ -z "$svc" ]; then
    return 1
  fi

  log "Restarting systemd service '$svc'"
  systemctl restart "$svc"
  systemctl is-active --quiet "$svc" || die "systemd service '$svc' failed to start"
  return 0
}

restart_with_nohup() {
  log "No PM2/systemd config detected, using nohup fallback"

  mkdir -p "$APP_DIR/logs"

  if [ -f "$APP_DIR/.deploy.pid" ]; then
    old_pid="$(cat "$APP_DIR/.deploy.pid" 2>/dev/null || true)"
    if [ -n "${old_pid:-}" ] && kill -0 "$old_pid" 2>/dev/null; then
      log "Stopping previous process PID $old_pid"
      kill "$old_pid" || true
      sleep 1
    fi
  fi

  if pgrep -f "node .*dist/server.js" >/dev/null 2>&1; then
    log "Stopping existing dist/server.js process"
    pkill -f "node .*dist/server.js" || true
    sleep 1
  fi

  log "Starting app with: $START_CMD"
  nohup bash -lc "$START_CMD" > "$APP_DIR/logs/app.out.log" 2> "$APP_DIR/logs/app.err.log" &
  echo $! > "$APP_DIR/.deploy.pid"
}

if restart_with_pm2; then
  log "Restarted using PM2"
elif restart_with_systemd; then
  log "Restarted using systemd"
else
  restart_with_nohup
  log "Restarted using nohup fallback"
fi

log "Deployment completed successfully"