#!/bin/zsh
# usage: go.sh '<query string>' [lines] — load render.html with the query and wait for it to finish
# (gives up after 150s without any new log line).
cd "${0:a:h}"
S=$(./session.sh | head -1)
MARK="go-$RANDOM-$RANDOM"
curl -s -X POST --data "$MARK" http://127.0.0.1:8765/log >/dev/null
bb browser-automation run $S --timeout 20s --script "const p = await browser.getPage('main'); p.goto('http://127.0.0.1:8765/render.html?$1').catch(()=>{}); return 'started'" --json >/dev/null 2>&1
LAST="" IDLE=0
until curl -s http://127.0.0.1:8765/logs | sed -n "/$MARK/,\$p" | grep -qE "^.{9}(done|FAIL|ERR|REJ)"; do
  sleep 2
  NOW=$(curl -s http://127.0.0.1:8765/logs | tail -1)
  if [[ "$NOW" == "$LAST" ]]; then IDLE=$(( IDLE + 2 )); else IDLE=0; LAST="$NOW"; fi
  if (( IDLE > 150 )); then echo "stalled"; break; fi
done
curl -s http://127.0.0.1:8765/logs | sed -n "/$MARK/,\$p" | grep -vE "^.{9}still" | tail -${2:-12}
