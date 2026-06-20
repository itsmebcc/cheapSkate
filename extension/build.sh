#!/bin/bash
# cheapSkate — Build script
# Packages the extension for Chrome (manifest.json) and Firefox (manifest.firefox.json)

set -e
cd "$(dirname "$0")"

OUTDIR="../dist"
mkdir -p "$OUTDIR"

# Chrome — use manifest.json
echo "Building Chrome extension..."
cp manifest.json "$OUTDIR/manifest.chrome.json"
cp manifest.json "$OUTDIR/../manifest.json" # root-level for Chrome
zip -j "$OUTDIR/cheapskate-chrome.zip" \
  manifest.json background.js content.js popup.html popup.js onboarding.html icons/icon128.png icons/icon48.png icons/icon32.png

# Firefox — use manifest.firefox.json
echo "Building Firefox extension..."
cp manifest.firefox.json "$OUTDIR/manifest.firefox.json"
cp manifest.firefox.json "$OUTDIR/../manifest.firefox.json"
# Firefox needs the manifest named manifest.json in the package
cp manifest.firefox.json "$OUTDIR/manifest.json"
zip -j "$OUTDIR/cheapskate-firefox.zip" \
  manifest.json background.js content.js popup.html popup.js onboarding.html icons/icon128.png icons/icon48.png icons/icon32.png

# Clean up
rm -f "$OUTDIR/manifest.json" "$OUTDIR/manifest.chrome.json" "$OUTDIR/manifest.firefox.json"

echo "Done:"
echo "  Chrome:  $OUTDIR/cheapskate-chrome.zip"
echo "  Firefox: $OUTDIR/cheapskate-firefox.zip"
