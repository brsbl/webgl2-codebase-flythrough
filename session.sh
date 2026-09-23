#!/bin/zsh
# Ensure one live headless session with at least MIN_LEFT seconds before its absolute expiry.
cd "${0:a:h}"
MIN_LEFT=${MIN_LEFT:-120}
S=$(cat .session 2>/dev/null)
LEFT=$(bb browser-automation list --json 2>/dev/null | node -e '
const j=JSON.parse(require("fs").readFileSync(0,"utf8")); const s=j.find(x=>x.id===process.argv[1]&&x.state==="ready");
console.log(s?Math.floor((s.expiresAt-Date.now())/1000):-1)' "$S")
if [[ "$LEFT" -gt "$MIN_LEFT" ]] && bb browser-automation run $S --script 'return 1' --json >/dev/null 2>&1; then echo "$S"; exit 0; fi
[[ -n "$S" ]] && bb browser-automation close $S --json >/dev/null 2>&1
J=$(bb browser-automation open --backend local --headless ${BB_MACHINE:+--machine $BB_MACHINE} --json 2>/dev/null | tail -1)
S=$(echo "$J" | node -e 'try{console.log(JSON.parse(require("fs").readFileSync(0,"utf8")).id||"")}catch{console.log("")}')
if [[ -z "$S" ]]; then
  S=$(bb browser-automation list --json | node -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8"));const r=j.filter(x=>x.state==="ready").sort((a,b)=>b.createdAt-a.createdAt)[0];console.log(r?r.id:"")')
fi
echo "$S" > .session
echo "$S"
echo "$J" | node -e 'try{const d=JSON.parse(require("fs").readFileSync(0,"utf8")).previewDirective; if(d) console.log("NEW "+d)}catch{}'
pkill -f 'keepalive-bb-session' 2>/dev/null
nohup zsh -c "exec -a keepalive-bb-session zsh -c 'while true; do sleep 150; bb browser-automation run $S --script \"return 1\" --json >/dev/null 2>&1 || exit 0; done'" >/dev/null 2>&1 &
