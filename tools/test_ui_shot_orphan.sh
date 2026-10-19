#!/bin/sh
# ui_shot.js nie może zostawić headless Chrome, gdy wyjście zamknięte wcześniej (| head)
cd "$(dirname "$0")"
node ui_shot.js ui_steps_models.json 2>/dev/null | head -1 >/dev/null
sleep 3
if pgrep -f "remote-debugging-port=9333" >/dev/null; then echo "FAIL: osierocony Chrome"; pkill -f "remote-debugging-port=9333"; exit 1; fi
echo OK
