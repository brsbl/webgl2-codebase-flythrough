#!/bin/zsh
# usage: stills.sh <prefix> <times> [extra query]
S=$(cat "${0:a:h}/.session")
bb browser-automation run $S --timeout 115s --script "const p = await browser.getPage('main'); await p.goto('http://127.0.0.1:8765/render.html?mode=stills&prefix=$1&times=$2&$3'); for (let i=0;i<220;i++){ const s = await p.evaluate(() => window.__state); if (s==='done'||s==='error') return s; await new Promise(r=>setTimeout(r,500)); } return 'timeout';" --json 2>&1 | head -c 300; echo
curl -s http://127.0.0.1:8765/logs | tail -${4:-6}
