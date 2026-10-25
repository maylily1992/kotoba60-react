#!/bin/zsh
set -euo pipefail

cd "$(dirname "$0")"
export XDG_CONFIG_HOME="$PWD/.wrangler-home/config"
export XDG_CACHE_HOME="$PWD/.wrangler-home/cache"
export WRANGLER_LOG_PATH="$PWD/.wrangler-home/logs"
export npm_config_cache="$PWD/.wrangler-home/npm-cache"
mkdir -p "$XDG_CONFIG_HOME" "$XDG_CACHE_HOME" "$WRANGLER_LOG_PATH" "$npm_config_cache"

if command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
elif [ -x "../../work/node/bin/node" ]; then
  export PATH="$(cd ../../work/node/bin && pwd):$PATH"
  NODE_BIN="$(command -v node)"
else
  echo "没有找到 Node.js。请先在项目目录运行 npm install。"
  read -r "?按回车关闭…"
  exit 1
fi

echo "Kotoba60 实时 AI 配置"
echo "1. 接下来会打开 Cloudflare 登录页面。登录后回到此窗口。"
echo "2. 你需要先在 https://platform.openai.com/api-keys 创建 API Key。"
echo "   ChatGPT 订阅不包含 API 额度，API 账户可能需要单独充值。"
echo
read -r "?已经准备好后，按回车继续…"

if [ ! -x "./node_modules/.bin/wrangler" ]; then
  echo "正在安装部署工具…"
  npm install
fi

echo
echo "正在打开 Cloudflare 授权页面…"
./node_modules/.bin/wrangler login

echo
echo "请粘贴 OpenAI API Key。输入内容不会显示，也不会写入项目文件。"
read -r -s "OPENAI_KEY?OpenAI API Key: "
echo

if [[ -z "${OPENAI_KEY:-}" ]]; then
  echo "API Key 为空，已取消。"
  exit 1
fi

printf '%s' "$OPENAI_KEY" | ./node_modules/.bin/wrangler secret put OPENAI_API_KEY --config worker/wrangler.toml
unset OPENAI_KEY

echo
echo "正在部署 Kotoba60 AI 代理…"
DEPLOY_OUTPUT="$(./node_modules/.bin/wrangler deploy --config worker/wrangler.toml 2>&1)"
printf '%s\n' "$DEPLOY_OUTPUT"
WORKER_URL="$(printf '%s\n' "$DEPLOY_OUTPUT" | grep -Eo 'https://[^[:space:]]+workers\.dev' | tail -n 1 || true)"

echo
if [[ -n "$WORKER_URL" ]]; then
  printf '%s\n' "$WORKER_URL" > worker-url.txt
  echo "部署完成。"
  echo "Worker 地址：$WORKER_URL"
  echo "请回到 Kotoba60 的 /dialogue 页面，把上面的地址粘贴到“AI 代理地址”。"
else
  echo "部署命令已完成，但没有自动识别 Worker 地址。"
  echo "请复制上方输出中的 workers.dev 地址。"
fi

echo
read -r "?完成后按回车关闭窗口。"
