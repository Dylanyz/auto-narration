---
description: how to create a new GitHub release for auto-narration
---

# Release Process for auto-narration

## Overview

Releases are created by pushing a `v*` git tag. GitHub Actions (`.github/workflows/release.yml`) automatically:
- Zips `chrome-extension/`, `premiere-extension/`, and `README.md` into `auto-narration-<tag>.zip`
- Creates a GitHub release with that zip attached and installation instructions as the body

## Steps

1. **Determine the new version.**
   - Check the latest tag with: `git tag -l --sort=-v:refname | head -5`
   - If the user doesn't specify, increment the **minor** version by default (e.g. v1.1 → v1.2). Increment **major** only for big breaking changes.

2. **Fetch the previous release body from the GitHub API** to copy the exact same instructions text:
   ```
   https://api.github.com/repos/Dylanyz/auto-narration/releases
   ```
   The `body` field of the latest release is what to reuse (with the new version's zip filename substituted). The release.yml already handles this dynamically via `${{ github.ref_name }}`, so no manual editing is needed.

3. **Ensure `release.yml` has the `body` field** (it should already, but verify):
   ```yaml
   body: |
     1. Download auto-narration-${{ github.ref_name }}.zip
     2. Do **not** use "Source code (zip)" — use the release zip.
     3. Unzip the file (double-click it). Put the folder somewhere easy to find (e.g. **Desktop**).
     4. Open that folder. You should see two folders inside: **`chrome-extension`** and **`premiere-extension`**, plus **`README.md`**.
     **You're good when:** You have one folder on your Desktop (or wherever) with `chrome-extension` and `premiere-extension` inside it.

     Follow instructions here: https://github.com/Dylanyz/auto-narration
   ```

4. **Commit any pending changes** (e.g. workflow updates), then tag and push:
   ```bash
   git add -A
   git commit -m "chore: prepare release <version>"   # only if there are changes to commit
   git tag <version>
   git push origin main
   git push origin <version>
   ```
   If there are no local changes, skip the add/commit and just tag + push.

5. **Verify** the Actions run started:
   ```
   https://api.github.com/repos/Dylanyz/auto-narration/actions/runs?per_page=3
   ```
   Confirm the latest run has `"status": "queued"` or `"in_progress"` for the new tag.

6. **Confirm release URL** to the user:
   ```
   https://github.com/Dylanyz/auto-narration/releases/tag/<version>
   ```
