#!/bin/bash
# Removes Church Lower Thirds from this Mac:
#   sudo "/Applications/Church Lower Thirds.app/Contents/Resources/uninstall.sh"
# Settings, names, images and the OBS source files stay in the person's folder (by default
# ~/Movies/Church Lower Thirds), so a later install picks them up again; delete that folder
# too to start from scratch.
LABEL=com.cultoemoff.churchlowerthirds
APP="/Applications/Church Lower Thirds.app"
if [ "$(id -u)" -ne 0 ]; then
  echo "Run with sudo: sudo \"$0\"" >&2
  exit 1
fi
# The server of every account that has one.
for home in /Users/*; do
  [ -f "$home/Library/LaunchAgents/$LABEL.plist" ] || continue
  user=$(/usr/bin/stat -f%Su "$home")
  uid=$(id -u "$user" 2>/dev/null) && /bin/launchctl bootout "gui/$uid/$LABEL" 2>/dev/null
  rm -f "$home/Library/LaunchAgents/$LABEL.plist"
done
/usr/bin/pkill -f "Church Lower Thirds.app/Contents/Resources/app/dist/server/index.js" 2>/dev/null || true
rm -rf "$APP"
/usr/sbin/pkgutil --forget "$LABEL" >/dev/null 2>&1 || true
echo "Church Lower Thirds removed."
