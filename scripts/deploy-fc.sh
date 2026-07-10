#!/usr/bin/env bash
# FC3 部署编排脚本：
#   apply  : build -> build:fc -> s deploy migrator -> invoke migrator -> s deploy app+domain -> smoke
#   plan   : s plan (diff 校验)
#   package: 仅打包不部署
#   info   : 输出当前函数状态
#   rollback: 回滚到上一版本
#   smoke  : 远程冒烟 /api/health
#   migrate: 仅调用 migrator（apply 之外独立跑迁移的场景，例如种子数据回填）
#
# 环境：
#   YISHAN_FC_ENV_FILE  指向 env 文件，默认 deploy/fc/prod.env
#   YISHAN_SKIP_BUILD=1 跳过 build/package
#   SMOKE_URL           默认 ${PUBLIC_APP_URL}/api/health
#   YISHAN_SKIP_MIGRATE=1 apply 时跳过 invoke migrator

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FC_DIR="$ROOT_DIR/deploy/fc"
ENV_FILE="${YISHAN_FC_ENV_FILE:-${DOCBASE_FC_ENV_FILE:-$FC_DIR/prod.env}}"
SKIP_BUILD="${YISHAN_SKIP_BUILD:-${DOCBASE_SKIP_BUILD:-0}}"
SKIP_MIGRATE="${YISHAN_SKIP_MIGRATE:-0}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

# Compute SMOKE_URL after sourcing ENV_FILE so PUBLIC_APP_URL is available.
SMOKE_URL="${SMOKE_URL:-${PUBLIC_APP_URL:-}/api/health}"

step() { printf '\n\033[1;34m[deploy-fc] %s\033[0m\n' "$1"; }

cmd="${1:-apply}"

case "$cmd" in
  package)
    step "build package"
    [[ "$SKIP_BUILD" != "1" ]] && npm run build && npm run build:fc
    ;;
  apply)
    step "build package"
    [[ "$SKIP_BUILD" != "1" ]] && npm run build && npm run build:fc
    step "s deploy (migrator)"
    ( cd "$FC_DIR" && set -a; source "$ENV_FILE"; set +a; \
      s deploy -y --use-local --template s.migrator.yaml )
    if [[ "$SKIP_MIGRATE" != "1" ]]; then
      step "invoke migrator"
      bash "$ROOT_DIR/scripts/migrate-invoke.sh"
    fi
    step "s deploy (app + domain)"
    ( cd "$FC_DIR" && set -a; source "$ENV_FILE"; set +a; \
      s deploy -y --use-local )
    step "smoke"
    curl -fsS --max-time 15 "$SMOKE_URL" >/dev/null && echo "[deploy-fc] smoke OK"
    ;;
  plan)
    step "s plan"
    ( cd "$FC_DIR" && s plan )
    ;;
  info)
    step "s info"
    ( cd "$FC_DIR" && s info )
    ;;
  rollback)
    step "rollback"
    ( cd "$FC_DIR" && s rollback -y )
    ;;
  smoke)
    step "smoke $SMOKE_URL"
    curl -fsS --max-time 15 "$SMOKE_URL" && echo "[deploy-fc] smoke OK"
    ;;
  migrate)
    step "invoke migrator"
    bash "$ROOT_DIR/scripts/migrate-invoke.sh"
    ;;
  *)
    echo "usage: $0 {apply|plan|package|info|rollback|smoke|migrate}" >&2
    exit 64
    ;;
esac
