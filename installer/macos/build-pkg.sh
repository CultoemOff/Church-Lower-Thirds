#!/bin/bash
# Builds the macOS installer package (CI: .github/workflows/installer.yml).
#   installer/macos/build-pkg.sh <version> <stage dir> <output .pkg>
# The stage dir holds what goes into "Church Lower Thirds.app/Contents/Resources":
#   runtime/node     universal Node.js (arm64 + x86_64)
#   app/             dist (server and web), package.json, node_modules, LICENSE.txt,
#                    THIRD-PARTY-NOTICES.txt
set -euo pipefail
version=$1
stage=$(cd "$2" && pwd)
out=$3
here=$(cd "$(dirname "$0")" && pwd)
repo=$(cd "$here/../.." && pwd)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

root="$work/root"
app="$root/Applications/Church Lower Thirds.app"
mkdir -p "$app/Contents/MacOS" "$app/Contents/Resources"
sed "s/@VERSION@/$version/g" "$here/Info.plist" > "$app/Contents/Info.plist"
plutil -lint "$app/Contents/Info.plist" "$here/launchagent.plist"
printf 'APPL????' > "$app/Contents/PkgInfo"
install -m 755 "$repo/scripts/macos/launcher.sh" "$app/Contents/MacOS/Church Lower Thirds"
install -m 755 "$repo/scripts/macos/run-server.sh" "$app/Contents/Resources/run-server.sh"
install -m 755 "$repo/scripts/macos/uninstall.sh" "$app/Contents/Resources/uninstall.sh"
install -m 644 "$here/launchagent.plist" "$app/Contents/Resources/launchagent.plist"
install -m 644 "$repo/assets/church-lower-thirds.icns" "$app/Contents/Resources/church-lower-thirds.icns"
cp -R "$stage/runtime" "$stage/app" "$app/Contents/Resources/"
chmod -R u+rwX,go+rX,go-w "$app"

# Always install to /Applications: never "update" a copy of the app found elsewhere.
pkgbuild --analyze --root "$root" "$work/component.plist"
i=0
while /usr/libexec/PlistBuddy -c "Print :$i" "$work/component.plist" >/dev/null 2>&1; do
  /usr/libexec/PlistBuddy -c "Set :$i:BundleIsRelocatable false" "$work/component.plist"
  i=$((i + 1))
done

pkgbuild --root "$root" --component-plist "$work/component.plist" \
  --identifier com.cultoemoff.churchlowerthirds --version "$version" \
  --scripts "$here/scripts" --install-location / "$work/church-lower-thirds-app.pkg"

# The license the person accepts is the one in the repository, not a copy of it. As a page,
# so the Installer reads its accented letters as UTF-8 (the text has no markup of its own).
cp -R "$here/resources" "$work/resources"
if grep -q '[<>&]' "$repo/LICENSE.txt"; then
  echo "LICENSE.txt has characters that need escaping in the installer's license page" >&2
  exit 1
fi
{
  printf '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>'
  printf '<pre style="white-space:pre-wrap;font-family:Menlo,monospace;font-size:11px">'
  cat "$repo/LICENSE.txt"
  printf '</pre></body></html>\n'
} > "$work/resources/license.html"
sed "s/@VERSION@/$version/g" "$here/distribution.xml" > "$work/distribution.xml"
mkdir -p "$(dirname "$out")"
productbuild --distribution "$work/distribution.xml" --resources "$work/resources" \
  --package-path "$work" "$out"
ls -la "$out"
