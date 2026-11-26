#!/bin/bash
# Runs the Church Lower Thirds server for the person logged in (started by launchd, see
# installer/macos/launchagent.plist). Each account of the Mac runs its own copy, with its
# own settings. What the server prints goes to ~/Library/Logs/Church Lower Thirds.
RES="$(cd "$(dirname "$0")" && pwd)"
LOGS="$HOME/Library/Logs/Church Lower Thirds"
/bin/mkdir -p "$LOGS"
# A log that only grows would be noticed years later: keep the last megabyte or so.
if [ -f "$LOGS/server.log" ] && [ "$(/usr/bin/stat -f%z "$LOGS/server.log")" -gt 1048576 ]; then
  /bin/mv -f "$LOGS/server.log" "$LOGS/server.old.log"
fi
cd "$RES/app" || exit 1
exec "$RES/runtime/node" "$RES/app/dist/server/index.js" >>"$LOGS/server.log" 2>&1
