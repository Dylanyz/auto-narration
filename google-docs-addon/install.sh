#!/bin/bash
# ─────────────────────────────────────────────────────────────
#  Auto Narration — Google Docs Add-on Installer
#  Uses Google's official clasp CLI to push your code directly
#  to your Google account. Run once, then you're done.
# ─────────────────────────────────────────────────────────────
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ADDON_DIR="$SCRIPT_DIR"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Auto Narration — Google Docs Add-on Installer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ── 1. Check for Node / npm
if ! command -v npm &> /dev/null; then
  echo ""
  echo "  ❌  npm not found. Please install Node.js from https://nodejs.org"
  exit 1
fi

# ── 2. Install clasp globally if not present
if ! command -v clasp &> /dev/null; then
  echo ""
  echo "► Installing clasp (Google Apps Script CLI)…"
  npm install -g @google/clasp
  echo "  Done."
else
  echo ""
  echo "► clasp already installed ($(clasp --version | head -1))"
fi

# ── 3. Log in to Google (opens browser — skip if credentials file already exists)
echo ""
echo "► Checking Google authentication…"
CREDS_FILE="$HOME/.clasprc.json"
if [ ! -f "$CREDS_FILE" ] || ! python3 -c "import json; d=json.load(open('$CREDS_FILE')); d['tokens']" &>/dev/null 2>&1; then
  echo "  A browser window will open — log in to your Google account."
  echo "  (This only happens once.)"
  echo ""
  clasp login
else
  echo "  Already logged in. ✓"
fi

# ── 4. Create or reuse the Apps Script project
echo ""
if [ -f "$ADDON_DIR/.clasp.json" ]; then
  echo "► Found existing project config (.clasp.json). Reusing it."
else
  echo "► Creating a new Apps Script project in your Google Drive…"
  cd "$ADDON_DIR"
  clasp create \
    --type standalone \
    --title "Auto Narration Bridge" \
    --rootDir "$ADDON_DIR"
  echo "  Done."
fi

# ── 5. Push the source files
echo ""
echo "► Pushing code to Google Apps Script…"
cd "$ADDON_DIR"
clasp push --force
echo "  Done."

# ── 6. Extract project URL and print next steps
SCRIPT_ID=$(python3 -c "import json; d=json.load(open('.clasp.json')); print(d.get('scriptId',''))" 2>/dev/null || echo "")
PROJECT_URL="https://script.google.com/d/${SCRIPT_ID}/edit"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅  Code pushed successfully!"
echo ""
echo "  One final step to activate (takes 30 seconds):"
echo ""
echo "  1. Open this URL in Chrome:"
echo "     $PROJECT_URL"
echo ""
echo "  2. Click  Deploy → Test deployments"
echo "  3. Click the ⚙️ gear icon and select  Editor Add-on"
echo "  4. Click  Install,  then go back to any Google Doc"
echo "  5. Refresh the doc — click  Extensions → Auto Narration"
echo ""
echo "  That's it! The add-on is installed and ready to use."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
