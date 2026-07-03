#!/usr/bin/env bash
# FC3 部署编排脚本：
#   apply  : build -> build:fc -> s deploy
#   plan   : s plan (diff 校验)
#   package: 仅打包不部署
#   info   : 输出当前函数状态
#   rollback: 回滚到上一版本
#   smoke  : 远程冒烟 /api/health
#
# 环境：
#   DOCBASE_FC_ENV_FILE  指向 env 文件，默认 fc-deploy/prod.env
#   DOCBASE_SKIP_BUILD=1 跳过 build/package
#   SMOKE_URL            默认 ${PUBLIC_APP_URL}/api/health

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FC_DIR="$ROOT_DIR/fc-deploy"
ENV_FILE="${DOCBASE_FC_ENV_FILE:-$FC_DIR/prod.env}"

SMOKE_URL="${SMOKE_URL:-${PUBLIC_APP_URL:-}/api/health}"

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

step() { printf '\n\033[1;34m[deploy-fc] %s\033[0m\n' "$1"; }

cmd="${1:-apply}"

case "$cmd" in
  package)
    step "build package"
    [[ "${DOCBASE_SKIP_BUILD:-0}" != "1" ]] && pnpm build && pnpm build:fc
    ;;
  apply)
    step "build package"
    [[ "${DOCBASE_SKIP_BUILD:-0}" != "1" ]] && pnpm build && pnpm build:fc
    step "s deploy"
    ( cd "$FC_DIR" && s deploy -y )
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
  *)
    echo "usage: $0 {apply|plan|package|info|rollback|smoke}" >&2
    exit 64
    ;;
esac
