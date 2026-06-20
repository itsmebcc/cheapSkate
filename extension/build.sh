#!/bin/bash
# cheapSkate — Build script
# Packages the extension for Chrome and Firefox.
# Requires Python 3 with zipfile module (standard library).

set -e
cd "$(dirname "$0")"

OUTDIR="../dist"
mkdir -p "$OUTDIR"

echo "Building Chrome extension..."
python3 -c "
import zipfile, os
ext_dir = '.'
out_dir = '../dist'
files = ['manifest.json', 'background.js', 'content.js', 'popup.html', 'popup.js', 'onboarding.html',
         'icons/icon128.png', 'icons/icon48.png', 'icons/icon32.png']
with zipfile.ZipFile(f'{out_dir}/cheapskate-chrome.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for f in files:
        z.write(os.path.join(ext_dir, f), f)
print('  Chrome: dist/cheapskate-chrome.zip (' + str(len(files)) + ' files)')
"

echo "Building Firefox extension..."
python3 -c "
import zipfile, os
ext_dir = '.'
out_dir = '../dist'
files = ['manifest.firefox.json', 'background.js', 'content.js', 'popup.html', 'popup.js', 'onboarding.html',
         'icons/icon128.png', 'icons/icon48.png', 'icons/icon32.png']
with zipfile.ZipFile(f'{out_dir}/cheapskate-firefox.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    z.write(os.path.join(ext_dir, 'manifest.firefox.json'), 'manifest.json')
    for f in files[1:]:
        z.write(os.path.join(ext_dir, f), f)
print('  Firefox: dist/cheapskate-firefox.zip (' + str(len(files)) + ' files)')
"

echo "Done."
