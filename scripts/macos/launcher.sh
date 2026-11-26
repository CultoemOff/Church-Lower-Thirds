#!/bin/bash
# "Church Lower Thirds.app": opens the settings in the browser, starting the server first if
# it is not running. The server itself runs from launchd (~/Library/LaunchAgents), so it
# starts with the Mac and is restarted if it crashes. The installer sets that up for the
# person who installs; any other account of the Mac gets it the first time it opens the app.
LABEL=com.cultoemoff.churchlowerthirds
AGENT="$HOME/Library/LaunchAgents/$LABEL.plist"
DATA="$HOME/Library/Application Support/Church Lower Thirds"
RES="$(cd "$(dirname "$0")/../Resources" && pwd)"

# The server notes the port it is using (8795, or the next free one) in location.json.
port() {
  local p
  p=$(/usr/bin/sed -n 's/.*"port"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$DATA/location.json" 2>/dev/null | /usr/bin/head -1)
  [[ "$p" =~ ^[0-9]+$ ]] && echo "$p" || echo 8795
}
up() { /usr/bin/curl -fs -m 1 "http://127.0.0.1:$(port)/api/health" >/dev/null 2>&1; }

if ! up; then
  if [ ! -f "$AGENT" ] && [ -f "$RES/launchagent.plist" ]; then
    /bin/mkdir -p "$HOME/Library/LaunchAgents"
    /bin/cp "$RES/launchagent.plist" "$AGENT"
  fi
  if [ -f "$AGENT" ]; then
    /bin/launchctl bootstrap "gui/$(id -u)" "$AGENT" 2>/dev/null ||
      /bin/launchctl kickstart "gui/$(id -u)/$LABEL" 2>/dev/null
  else
    # No way to register with launchd: run the server for this session.
    nohup /bin/bash "$RES/run-server.sh" >/dev/null 2>&1 &
  fi
  for _ in $(seq 1 40); do
    up && break
    sleep 0.25
  done
fi
exec /usr/bin/open "http://127.0.0.1:$(port)/settings"
