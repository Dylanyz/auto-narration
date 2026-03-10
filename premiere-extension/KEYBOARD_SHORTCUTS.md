# Premiere Pro CEP Extension — Keyboard Shortcuts Reference

## What Works and What Doesn't

### Panel Shortcuts (when panel is focused)

**How it works:** `registerKeyEventsInterest` tells Premiere to forward specific keystrokes
to the CEP panel instead of consuming them.

**Critical detail:** On macOS, this API expects **macOS native/Carbon virtual keyCodes (0–127)**,
NOT DOM keyCodes. For example, the letter "A" is keyCode `0` on macOS but `65` in DOM.
Without registration, Premiere intercepts keystrokes and plays the macOS alert sound.

**Our solution:** Register ALL keyCodes 0–127 in one call on panel load:
```javascript
var keys = [];
for (var kc = 0; kc < 128; kc++) keys.push({ keyCode: kc });
__adobe_cep__.registerKeyEventsInterest(JSON.stringify(keys));
```

**What works:**
- Single keys (letters, numbers, F1–F12) — all work
- The keydown event fires with standard DOM keyCodes after registration

**What does NOT work (macOS hard limitation):**
- Cmd/Meta key combos — cannot be captured by CEP panels, period
- Ctrl/Shift/Alt combos — also don't seem to reach the panel reliably in Premiere
- Only bare single keys and function keys are reliable

**Recommendation:** Use F2 for Import, F3 for Insert (or similar single keys).

---

### Global Shortcuts (work from timeline, panel not focused)

Premiere Pro does NOT support assigning keyboard shortcuts to CEP extension commands.
`registerKeyEventsInterest` only works when the panel has focus.

**Our solution: Headless "trigger" panels + macOS App Shortcuts**

Architecture:
1. Two extra CEP extensions (`com.autonarration.import`, `com.autonarration.insert`)
   declared as `<Type>Panel</Type>` with menu entries "AN: Import Latest" / "AN: Insert Latest"
2. These appear under **Window → Extensions** in Premiere's menu bar
3. macOS App Shortcuts (System Settings → Keyboard → App Shortcuts) can target these
   menu items by their exact title
4. The panels auto-start with Premiere via `<StartOn><Event>applicationActivate</Event></StartOn>`
   and `<AutoVisible>false</AutoVisible>`
5. When the macOS shortcut fires, Premiere focuses the headless panel, triggering its
   `focus`/`visibilitychange` event handler

**Critical: headless panels must be SELF-CONTAINED.**
Cross-panel communication (CSXS events, localStorage storage events) proved unreliable.
Each headless panel:
- Reads settings from `localStorage` (shared origin within the bundle)
- Uses Node.js `fs` to find the latest audio file
- Calls `__adobe_cep__.evalScript("importAndPlace(...)")` directly — no message passing

**Known issue (fixed):** The `focus`/`visibilitychange` events don't fire reliably
when the macOS App Shortcut triggers the menu item. Fix: added `setInterval` polling
(250ms) that detects `document.hasFocus()` and `!document.hidden` transitions.
The event listeners are kept as a fast path; polling is the reliable fallback.

---

## How Other Extensions Solve This

### Excalibur / Knights of the Editing Table — "Spellbook"
Spellbook is a **standalone native macOS/Windows application** (not a CEP extension).
It monitors keystrokes at the OS level and communicates with CEP extensions via IPC.
This is how it captures global shortcuts — it bypasses CEP limitations entirely.
Cost: $50 standalone, free with their extensions.
npm package: `@knights-of-the-editing-table/spell-book`

### Justin Taylor's "Register All Keys" approach
Blog: https://justintaylor.tv/hotkeys-in-cep/
Generates all possible keyCode entries (0–127 on macOS) and registers them all.
This is what we implemented. Works for panel-focused shortcuts only.

### JSX → CSXSEvent pattern (After Effects community solution)
Put a JSX file in the Scripts folder that dispatches a CSXSEvent:
```jsx
var xLib = new ExternalObject('lib:\\PlugPlugExternalObject');
var evt = new CSXSEvent();
evt.type = 'MY_EVENT';
evt.dispatch();
```
Main panel listens: `__adobe_cep__.addEventListener('MY_EVENT', 'myGlobalHandler()')`.
Note: `addEventListener` on raw `__adobe_cep__` expects a **string** (JS expression to eval),
not a function reference. This works in After Effects but Premiere doesn't have a Scripts
menu for assigning shortcuts to JSX files.

---

## Raw `__adobe_cep__` API Notes

The project uses the raw `__adobe_cep__` global instead of `CSInterface.js`.

Key methods:
- `evalScript(script, callback)` — runs ExtendScript/JSX in Premiere's scripting engine
- `registerKeyEventsInterest(jsonString)` — registers keys to forward to panel (macOS native keyCodes!)
- `addEventListener(type, callbackString)` — listens for CSXS events; callback must be a **STRING**
  (e.g. `'window.myHandler()'`), NOT a function reference
- `closeExtension()` — closes the panel; has known bugs (freezing, not reloading on reopen)

---

## Current Status (as of this session)

### Working:
- Panel shortcuts: single keys and function keys register and execute actions correctly
- Shortcut recording UI: click box, press key, it saves
- Global shortcut: macOS App Shortcut opens/focuses the headless panel
- Headless panels auto-start with Premiere (no manual open needed)
- Headless panels are self-contained (read settings, find file, call JSX directly)

### Fixed (needs testing in Premiere):
- Global shortcut performing the insert/import action on the sequence
  - Root cause: CEP panels don't reliably fire `focus`/`visibilitychange` events
    when activated via menu items (macOS App Shortcuts)
  - Fix: added `setInterval` polling (250ms) alongside event listeners to detect
    `document.hasFocus()` and `!document.hidden` transitions
  - The 500ms debounce in `doAction()` prevents double-fires from multiple paths

### Startup / first paint:
- Main panel defers loading `main.js` by one frame (requestAnimationFrame/setTimeout) and runs init (registerAllKeys, loadSettings, etc.) in a deferred tick so the panel paints before heavy work — avoids grey window on first launch.
- Headless panels defer the 200ms focus-polling `setInterval` by 1.5s so they don’t add timers at launch; focus/resize event handlers stay active so global shortcuts still work immediately.

### Files involved:
- `main.js` — main panel logic, panel shortcuts, registerAllKeys(), deferred init
- `index.html` — UI with settings, shortcut recording buttons, deferred script load
- `premiere.jsx` — ExtendScript functions (importAndPlace, importOnly, dispatchAN*)
- `import_headless.html` — self-contained Import Latest trigger panel
- `insert_headless.html` — self-contained Insert Latest trigger panel
- `CSXS/manifest.xml` — extension declarations, auto-start config
- `install.sh` — copies files to CEP extensions dir, enables debug mode
