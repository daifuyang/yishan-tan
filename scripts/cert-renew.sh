#!/usr/bin/env bash
#
# 证书自动续签 — 给 tan.zerocmf.com 续命 90 天一次的 Let's Encrypt 证书。
#
# 原理：
# - 用 acme.sh 通过 ACME DNS-01（aliyun DNS provider）签发新证书到本地固定路径。
# - 通过 aic aliyun-cert:upload 把新证书推到 Aliyun CAS，名字固定 yishan-tan-cert，
#   这样 deploy/fc/s.yaml 引用同一个名字、零改动。
# - 加一道 30 天/未过期则跳过的检查，避免重复刷写 CAS（避免触手可及调用频控）。
#
# 依赖：
# - aic CLI（npm i -g aic，或者从 workbench-tools/aliyun-toolkit install）。
# - ~/.acme.sh/acme.sh（cert-auto 同款：先 issue 触发器种，再这里跑）。
# - Aliyun RAM：personal 账号有 zerocmf.com DNS 写权限（DNS-01 校验用），
#   enterprise 账号有 CAS 写权限（上传到 yishan-tan-cert 用）。
#
# 触发方式：
# - 本地 cron（推荐）：crontab -e 加一行 `0 3 * * 0 .../cert-renew.sh` 每周日 03:00 跑。
# - 未来：GH Actions schedule workflow（需要 personal AK secrets + OIDC STS 给 CAS）。

set -euo pipefail

CERT_DOMAIN="${CERT_DOMAIN:-tan.zerocmf.com}"
CAS_CERT_NAME="${CAS_CERT_NAME:-yishan-tan-cert}"
RENEW_THRESHOLD_DAYS="${RENEW_THRESHOLD_DAYS:-30}"
ALIBABA_DNS_PROFILE="${ALIBABA_DNS_PROFILE:-personal}"        # DNS-01 用 personal（zerocmf.com 在 personal 账号）
ALIBABA_CAS_PROFILE="${ALIBABA_CAS_PROFILE:-enterprise}"        # 上传 CAS 用 enterprise（CAS 在 enterprise 账号）

step() { printf '\n\033[1;34m[cert-renew] %s\033[0m\n' "$1"; }

# 1. 看现在 CAS 上 yishan-tan-cert 多少天后过期
step "Checking current cert state on CAS (name=$CAS_CERT_NAME)"
CURRENT_LINE=$(
  aic aliyun-cert:list -p "$ALIBABA_CAS_PROFILE" \
    | python3 -c "
import json, sys, datetime
d = json.loads(sys.stdin.read())
match = None
for c in d.get('certificates', []):
    if c.get('name') == '${CAS_CERT_NAME}':
        match = c
        break
if not match:
    sys.exit(2)
end = datetime.date.fromisoformat(match['endDate'])
days = (end - datetime.date.today()).days
print(end.isoformat(), days)
" 2>&1 || true
)

if [ -z "$CURRENT_LINE" ] || [ "$(echo "$CURRENT_LINE" | wc -w)" -lt 2 ]; then
  # 没有找到，必须签一张
  step "Existing cert ${CAS_CERT_NAME} not found in CAS — must issue a fresh one"
  SHOULD_RENEW=1
  CURRENT_END_DATE="N/A"
  DAYS_LEFT="N/A"
else
  CURRENT_END_DATE=$(echo "$CURRENT_LINE" | awk '{print $1}')
  DAYS_LEFT=$(echo "$CURRENT_LINE" | awk '{print $2}')
  echo "  current end: $CURRENT_END_DATE  ($DAYS_LEFT days remaining)"
  if [ "$DAYS_LEFT" -le "$RENEW_THRESHOLD_DAYS" ]; then
    SHOULD_RENEW=1
  else
    SHOULD_RENEW=0
  fi
fi

if [ "${SHOULD_RENEW:-0}" -eq 0 ]; then
  step "Cert still fresh (days_left=$DAYS_LEFT > $RENEW_THRESHOLD). Skip."
  exit 0
fi

step "Renewing cert for ${CERT_DOMAIN}"

# 2. ACME DNS-01 issue (acme.sh under the hood aic depends on)
echo
aic cert:issue -p "$ALIBABA_DNS_PROFILE" -d aliyun "$CERT_DOMAIN"

# 3. 找到 aic 写到本地的 cert / key 路径
# aic cert:issue 输出会包含 certPath / keyPath 的 JSON 行。
CERT_PATH=""
KEY_PATH=""
TMP=$(aic cert:list -p "$ALIBABA_DNS_PROFILE" --filter "$CERT_DOMAIN" 2>&1 || true)
# 改用查最新一份 .cer / .key（acme.sh 默认放 ~/.acme.sh/<domain>/）
SH_DIR="${HOME}/.acme.sh/${CERT_DOMAIN}"
if [ -f "${SH_DIR}/fullchain.cer" ] && [ -f "${SH_DIR}/tan.zerocmf.com.key" ]; then
  CERT_PATH="${SH_DIR}/fullchain.cer"
  KEY_PATH="${SH_DIR}/tan.zerocmf.com.key"
elif [ -f "${SH_DIR}/fullchain.pem" ]; then
  CERT_PATH="${SH_DIR}/fullchain.pem"
  KEY_PATH="${SH_DIR}/privkey.pem"
else
  echo "::error::Could not locate issued cert files under ${SH_DIR}"
  exit 3
fi

echo "  cert: $CERT_PATH"
echo "  key:  $KEY_PATH"

# 4. 上传到 CAS，用老名字 yishan-tan-cert（替换之前的）
step "Uploading to CAS as ${CAS_CERT_NAME}"
aic aliyun-cert:upload -p "$ALIBABA_CAS_PROFILE" \
  --name "$CAS_CERT_NAME" \
  "$CERT_PATH" "$KEY_PATH"

# 5. 取回新 cert 校验
step "Verifying upload"
aic aliyun-cert:list -p "$ALIBABA_CAS_PROFILE" \
  | python3 -c "
import json, sys, datetime
d = json.loads(sys.stdin.read())
match = next(c for c in d['certificates'] if c.get('name') == '${CAS_CERT_NAME}')
end = datetime.date.fromisoformat(match['endDate'])
print(f\"  ✔ {match['name']} certId={match['certId']} expires={end} ({(end - datetime.date.today()).days}d)\")
"

step "Renew complete. Next deploy will pick up the renewed cert via s.yaml certName: $CAS_CERT_NAME"
