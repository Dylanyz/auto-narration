#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Auto Narration Bridge — Premiere Pro Extension Installer
#  Run this once to install the extension and enable debug mode.
# ─────────────────────────────────────────────────────────────

set -e

EXTENSION_ID="com.autonarration.premierebridge"
INSTALL_DIR="$HOME/Library/Application Support/Adobe/CEP/extensions/$EXTENSION_ID"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Auto Narration Bridge — Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Enable unsigned extension loading for all CEP versions
echo ""
echo "► Enabling CEP debug mode (allows unsigned extensions)…"
for version in 9 10 11; do
  defaults write "com.adobe.CSXS.$version" PlayerDebugMode 1
done
echo "  Done."

# ── 2. Copy extension files
echo ""
echo "► Installing extension to:"
echo "  $INSTALL_DIR"

rm -rf "$INSTALL_DIR"
mkdir -p "$INSTALL_DIR"
cp -R "$SCRIPT_DIR/." "$INSTALL_DIR/"
# Remove the install script itself from the installed copy
rm -f "$INSTALL_DIR/install.sh"

echo "  Done."

# ── 3. Done
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Installation complete!"
echo ""
echo "  Next steps:"
echo "  1. Quit Premiere Pro if it is open."
echo "  2. Re-open Premiere Pro."
echo "  3. Go to: Window → Extensions → Auto Narration Bridge"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
