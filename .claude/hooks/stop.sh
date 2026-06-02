#!/usr/bin/env bash
# Stop hook for Claude Code.
# Runs lint / typecheck / test / build only for the area that actually changed.
# Silent on success. Non-zero exit surfaces failures back to Claude.

set -uo pipefail

REPO_ROOT="${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel 2>/dev/null)}"
[ -z "$REPO_ROOT" ] && exit 0
cd "$REPO_ROOT" || exit 0

# Drain stdin (Claude sends JSON we don't need).
cat >/dev/null 2>&1 || true

# Workflow gate: skip build/test while a workflow is in progress.
# Claude flips this file between `active` and `idle`.
STATE_FILE="$REPO_ROOT/.claude/.workflow-state"
if [ -f "$STATE_FILE" ]; then
  STATE=$(head -n 1 "$STATE_FILE" 2>/dev/null | tr -d '[:space:]')
  if [ "$STATE" = "active" ]; then
    exit 0
  fi
fi

CHANGED=$(git status --porcelain 2>/dev/null)
[ -z "$CHANGED" ] && exit 0

FAILED=0
run_mobile=0
run_service=0
run_docs=0
run_supabase=0

while IFS= read -r line; do
  path="${line:3}"
  case "$path" in
    ui-mobile/*|truespend-mobile/*|src/*|app/*|*.tsx|*.ts|package.json|package-lock.json|tsconfig*.json) run_mobile=1 ;;
  esac
  case "$path" in
    service/*|*.cs|*.csproj|*.sln|*/appsettings*.json) run_service=1 ;;
  esac
  case "$path" in
    docs/*|_docs/*) run_docs=1 ;;
  esac
  case "$path" in
    supabase/*) run_supabase=1 ;;
  esac
done <<< "$CHANGED"

# Mobile
MOBILE_DIR=""
if [ -d "ui-mobile" ] && [ -f "ui-mobile/package.json" ]; then
  MOBILE_DIR="ui-mobile"
elif [ -d "truespend-mobile" ] && [ -f "truespend-mobile/package.json" ]; then
  MOBILE_DIR="truespend-mobile"
fi

if [ "$run_mobile" = "1" ] && [ -n "$MOBILE_DIR" ]; then
  echo "[stop-hook] mobile: lint + typecheck + test"
  (
    cd "$MOBILE_DIR" && \
    npm run lint --if-present && \
    npx --no tsc --noEmit && \
    npm test --silent --if-present
  ) || FAILED=1
fi

# Service (.NET)
if [ "$run_service" = "1" ]; then
  if [ -d "service" ]; then
    SLN=$(find service -maxdepth 4 -name "*.sln" -not -path "*/node_modules/*" 2>/dev/null | head -n 1)
  else
    SLN=""
  fi
  if [ -z "$SLN" ]; then
    SLN=$(find . -maxdepth 4 -name "*.sln" -not -path "*/node_modules/*" 2>/dev/null | head -n 1)
  fi
  if [ -n "$SLN" ]; then
    echo "[stop-hook] service: dotnet build + test ($SLN)"
    dotnet build "$SLN" --nologo -v q || FAILED=1
    dotnet test  "$SLN" --nologo -v q --no-build || FAILED=1
  fi
fi

# Supabase
if [ "$run_supabase" = "1" ]; then
  if command -v supabase >/dev/null 2>&1 && [ -d "supabase" ]; then
    echo "[stop-hook] supabase: migration lint"
    supabase migration lint || FAILED=1
  fi
fi

# Docs only (skip if code work already ran)
if [ "$run_docs" = "1" ] && [ "$run_mobile" = "0" ] && [ "$run_service" = "0" ] && [ "$run_supabase" = "0" ]; then
  if command -v markdownlint >/dev/null 2>&1; then
    DOC_TARGETS=()
    [ -d "docs" ] && DOC_TARGETS+=("docs/**/*.md")
    [ -d "_docs" ] && DOC_TARGETS+=("_docs/**/*.md")
    if [ "${#DOC_TARGETS[@]}" -gt 0 ]; then
      echo "[stop-hook] docs: markdownlint"
      markdownlint "${DOC_TARGETS[@]}" || FAILED=1
    fi
  fi
fi

exit $FAILED
