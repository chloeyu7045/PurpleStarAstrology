#!/bin/bash
# 雙擊這個檔案就會啟動 App 並自動開啟瀏覽器。
# 關掉這個終端機視窗就等於關掉 App。

cd "$(dirname "$0")" || exit 1

PORT=8080
# 如果 8080 被佔用，往後找一個沒被用的
while lsof -i ":$PORT" >/dev/null 2>&1; do
  PORT=$((PORT + 1))
done

echo ""
echo "=============================================="
echo "  紫微斗數 · 命盤解析"
echo "=============================================="
echo ""
echo "網址： http://localhost:$PORT"
echo ""
echo "瀏覽器會自動打開。"
echo "要關閉 App：直接關掉這個視窗，或按 Control + C。"
echo ""

# 等伺服器起來再開瀏覽器
( sleep 1; open "http://localhost:$PORT" ) &

python3 serve.py "$PORT"
