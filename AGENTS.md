# AGENTS.md

## Cursor Cloud specific instructions

### Overview

**Auto Narration Bridge** is a two-part tool: a Chrome Extension (Manifest V3) that generates AI voiceovers via ElevenLabs TTS, and an Adobe Premiere Pro CEP Extension (macOS-only) that imports audio into the timeline. See `README.md` for full user-facing documentation.

### Codebase structure

- `chrome-extension/` — Chrome Manifest V3 extension (vanilla JS, no build step, no dependencies)
- `premiere-extension/` — Adobe CEP panel for Premiere Pro (vanilla JS + ExtendScript, macOS-only)
- `.github/workflows/release.yml` — CI: zips both extensions on tag push and creates a GitHub Release
- `.cursor/rules/premiere-extension.mdc` — Cursor rule with CEP keyboard shortcut context

### Development notes

- **Zero dependencies**: no `package.json`, no `node_modules`, no pip, no build tools. Code runs as-is.
- **No build step**: all files are plain HTML/JS/CSS/JSX deployed directly.
- **No automated tests or linting**: the codebase has no test framework or linter configured.
- **Chrome extension testing**: load `chrome-extension/` as an unpacked extension via `chrome://extensions/` with Developer mode enabled. Requires a valid ElevenLabs API key to generate audio.
- **Premiere extension testing**: macOS-only. Run `premiere-extension/install.sh` to deploy to CEP extensions directory. Requires Adobe Premiere Pro 2021+.
- **Icons**: `chrome-extension/icons/` contains `icon16.png`, `icon48.png`, `icon128.png`.

### Running in Cloud VM (Linux)

- Only the Chrome extension can be tested (Premiere extension requires macOS + Adobe Premiere Pro).
- Chrome is pre-installed. Load the extension as unpacked from `/workspace/chrome-extension`.
- The extension needs an ElevenLabs API key configured in its Settings to generate audio.
- Generated `.mp3` files are saved to Chrome's Downloads folder (`~/Downloads/`).
