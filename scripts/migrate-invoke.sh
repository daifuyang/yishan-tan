#!/usr/bin/env bash
# 触发 yishan-tan-migrator 函数（仅 sync 调用，由 s fc3 invoke 走 FC API，
# 不经过 HTTP 也不需要自定义域名）。
#
# 用法：
#   bash scripts/migrate-invoke.sh                       # 标准 apply
#   YISHAN_FC_ENV_FILE=... bash scripts/migrate-invoke.sh
#   DRY_RUN=1 bash scripts/migrate-invoke.sh             # 只连通性探活

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FC_DIR="$ROOT_DIR/deploy/fc"

ENV_FILE="${YISHAN_FC_ENV_FILE:-$FC_DIR/prod.env}"
if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "[migrate-invoke] WARNING: $ENV_FILE not found, using current shell env" >&2
fi

REGION="${REGION:-cn-shanghai}"
FUNCTION_NAME="${FUNCTION_NAME:-yishan-tan-migrator}"
SERVICE_NAME="${SERVICE_NAME:-default}"
QUALIFIER="${QUALIFIER:-LATEST}"
# s CLI profile alias; matches deploy/fc/{s.yaml,s.migrator.yaml} `access:` and the
# fc-deploy-env composite action's `profile-name` default. CI deploy.yml writes its
# STS triplet to this profile; locally the same alias typically points at a long-lived AK.
ACCESS_ALIAS="${ACCESS_ALIAS:-default}"
TIMEOUT="${TIMEOUT:-180}"
DRY_RUN="${DRY_RUN:-0}"

step() { printf '\n\033[1;34m[migrate-invoke] %s\033[0m\n' "$1"; }

step "s fc3 invoke region=$REGION service=$SERVICE_NAME function=$FUNCTION_NAME qualifier=$QUALIFIER access=$ACCESS_ALIAS"

if [[ "$DRY_RUN" == "1" ]]; then
  step "DRY_RUN=1 — skipping actual invoke"
  echo "[migrate-invoke] would run:"
  echo "  s cli fc3 invoke \\"
  echo "    -a $ACCESS_ALIAS --region $REGION \\"
  echo "    --function-name $FUNCTION_NAME --qualifier $QUALIFIER \\"
  echo "    --event '{}' --timeout $TIMEOUT"
  exit 0
fi

# s cli fc3 invoke 通过 Event 走 sync 调用；custom.debian12 在 cold start 时执行
# bootstrap 一次（migrator-bootstrap 完成 migrate.mjs），函数实例退出后 invoke 返回。
# 注意：FC sync invoke 在 custom runtime 下，只要函数进程退出（即使 status 0），API 都会返回
# CAExited 412；这是 FC 把「custom runtime 主动退出」视为预期外退出。我们靠日志中
# `[db-migrate] OK` marker 来判断真正成功 —— *不*因为 412 直接失败。
output=$(s cli fc3 invoke \
  -a "$ACCESS_ALIAS" \
  --region "$REGION" \
  --function-name "$FUNCTION_NAME" \
  --qualifier "$QUALIFIER" \
  --event '{}' \
  --timeout "$TIMEOUT" 2>&1) || invoke_rc=$?
invoke_rc=${invoke_rc:-0}

printf '%s\n' "$output"

if grep -qE "\[db-migrate\] FAILED" <<<"$output"; then
  echo "[migrate-invoke] migrator reported failure (migrate.mjs exited non-zero)" >&2
  exit 2
fi

if grep -q "\[db-migrate\] OK" <<<"$output"; then
  step "migrator OK (function exited 0; FC sync invoke returned $invoke_rc — tolerated)"
  exit 0
fi

if [[ $invoke_rc -eq 0 ]]; then
  echo "[migrate-invoke] invoke succeeded but no OK marker found in logs" >&2
  exit 3
fi

echo "[migrate-invoke] invoke failed (rc=$invoke_rc) and no OK marker found" >&2
exit 1
