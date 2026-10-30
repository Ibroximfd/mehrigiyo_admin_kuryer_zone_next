#!/usr/bin/env bash
#
# Local -> prod deploy: Mehrigiyo Logist (Next.js).
#
# Statik build'ni lokalda yig'adi, serverga yuboradi, so'ng u yerda Docker
# image'ni qayta qurib containerni ishga tushiradi.
#
# Qaysi backendga ulanishi `config/servers.mjs` da tanlanadi. Vaqtincha
# boshqasiga chiqarish uchun:
#   APP_SERVER=test ./deploy.sh
#
# Sozlash (o'z serveringizga moslang):
#   SERVER=root@1.2.3.4 PORT=8082 ./deploy.sh
#
set -euo pipefail

SERVER="${SERVER:-root@193.149.18.31}"
REMOTE_DIR="${REMOTE_DIR:-/home/mehrigiyo-logist}"
CONTAINER="${CONTAINER:-mehrigiyo-logist}"
IMAGE="${IMAGE:-mehrigiyo-logist}"
# Operator paneli 8081 da — logist 8082 da turadi.
PORT="${PORT:-8082}"

BACKEND="$(node -e "import('./config/servers.mjs').then(m => { const s = m.resolveServer(); console.log(s.label + ' (' + s.host + ')'); })")"
echo "==> Backend: $BACKEND"

echo "==> [1/4] Statik build (nginx.conf + next build -> out/)"
npm ci
npm run build

echo "==> [2/4] Build + docker konfiguratsiyani $SERVER:$REMOTE_DIR ga yuborish"
ssh "$SERVER" "rm -rf '$REMOTE_DIR/out' && mkdir -p '$REMOTE_DIR/out'"
scp -r out/* "$SERVER:$REMOTE_DIR/out/"
scp Dockerfile nginx.conf "$SERVER:$REMOTE_DIR/"

echo "==> [3/4] Serverda image qurish"
ssh "$SERVER" "cd '$REMOTE_DIR' && docker build -t '$IMAGE' ."

echo "==> [4/4] '$CONTAINER' containerini $PORT portda qayta ishga tushirish"
ssh "$SERVER" "docker rm -f '$CONTAINER' 2>/dev/null || true && \
  docker run -d --restart unless-stopped -p $PORT:80 --name '$CONTAINER' '$IMAGE'"

echo "==> Tayyor. '$CONTAINER' $PORT portda ishlayapti — front nginx'dan proxy qiling."
