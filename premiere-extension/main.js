/**
 * main.js  —  Premiere Pro CEP Panel Logic
 *
 * Runs in the CEP browser/Node mixed context.
 * Uses Node's 'fs' + 'path' to read the configured folder,
 * and Adobe's CSInterface bridge to call premiere.jsx functions.
 */

// Error handler and tab switching are set up in the inline script in index.html

/* ════════════════════════════════════════════════
   SETUP — Node.js modules & CEP bridge
════════════════════════════════════════════════ */

// CEP 12+ may expose Node via cep_node instead of global require
var _require = (typeof require === 'function')
    ? require
    : (typeof cep_node !== 'undefined' && cep_node.require)
        ? cep_node.require
        : null;

var fs, nodePath;
try {
    fs = _require('fs');
    nodePath = _require('path');
} catch (e) {
    fs = null;
    nodePath = null;
}

// Minimal CEP bridge using the raw __adobe_cep__ global
var _cep = (typeof __adobe_cep__ !== 'undefined') ? __adobe_cep__ : null;

function evalScript(script) {
    return new Promise(function (resolve) {
        if (!_cep) {
            console.warn('[DevMode] evalScript called:', script.slice(0, 80));
            resolve('DEV_MODE');
            return;
        }
        _cep.evalScript(script, function (result) { resolve(result); });
    });
}

/* ════════════════════════════════════════════════
   SETTINGS
════════════════════════════════════════════════ */
var SETTINGS_KEY = 'autoNarrationPremiereSettings';

var settings = {
    folderPath: '',
    binPath: 'Audio/VO',
    trackIndex: 0,        // 0-based internally, shown as 1-based in UI
    maxFiles: 500,        // 0 = scan all
    refreshBeforeLatest: true,
    shortcuts: {
        importLatest: { keyCode: 73, metaKey: true, shiftKey: false, altKey: false, ctrlKey: false },
        insertLatest: { keyCode: 73, metaKey: true, shiftKey: true, altKey: false, ctrlKey: false }
    }
};

function loadSettings() {
    try {
        var raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) {
            var saved = JSON.parse(raw);
            // Merge shortcuts separately to preserve defaults for missing keys
            var savedShortcuts = saved.shortcuts;
            delete saved.shortcuts;
            Object.assign(settings, saved);
            if (savedShortcuts) {
                settings.shortcuts = Object.assign({}, settings.shortcuts, savedShortcuts);
            }
        }
    } catch (e) { }

    // Default to Downloads folder if no folder configured
    if (!settings.folderPath) {
        try {
            var home = process.env.HOME || '';
            if (home) settings.folderPath = home + '/Downloads';
        } catch (e) { }
    }

    populateSettingsForm();
}

function populateSettingsForm() {
    document.getElementById('folderPathInput').value = settings.folderPath;
    document.getElementById('binPathInput').value = settings.binPath;
    document.getElementById('trackIndexInput').value = settings.trackIndex + 1;
    document.getElementById('refreshBeforeLatest').checked = settings.refreshBeforeLatest;

    // Max files dropdown
    var select = document.getElementById('maxFilesSelect');
    var customInput = document.getElementById('maxFilesCustomInput');
    var val = settings.maxFiles;

    if (val === 5) { select.value = '5'; }
    else if (val === 500) { select.value = '500'; }
    else if (val === 0) { select.value = '0'; }
    else { select.value = 'custom'; customInput.value = val; }

    customInput.style.display = (select.value === 'custom') ? '' : 'none';

    // Shortcut buttons
    var sc = settings.shortcuts || {};
    document.getElementById('importShortcutBtn').textContent = shortcutLabel(sc.importLatest);
    document.getElementById('insertShortcutBtn').textContent = shortcutLabel(sc.insertLatest);
    updateShortcutHints();
}

function saveSettings() {
    settings.folderPath = document.getElementById('folderPathInput').value.trim();
    settings.binPath = document.getElementById('binPathInput').value.trim();
    settings.trackIndex = Math.max(0, parseInt(document.getElementById('trackIndexInput').value, 10) - 1);
    settings.refreshBeforeLatest = document.getElementById('refreshBeforeLatest').checked;

    // Max files
    var selectVal = document.getElementById('maxFilesSelect').value;
    if (selectVal === 'custom') {
        settings.maxFiles = Math.max(1, parseInt(document.getElementById('maxFilesCustomInput').value, 10) || 500);
    } else {
        settings.maxFiles = parseInt(selectVal, 10);  // 5, 500, or 0
    }

    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { }

    registerShortcuts();
    setStatus('Settings saved.', 'ok');
    switchTab('mainView');
    refreshFileList();
}

/* ════════════════════════════════════════════════
   BROWSE FOR FOLDER (via ExtendScript dialog)
════════════════════════════════════════════════ */
function browseFolder() {
    evalScript('browseForFolder()').then(function (result) {
        if (result && result !== '' && result !== 'DEV_MODE' && !result.startsWith('ERROR')) {
            document.getElementById('folderPathInput').value = result;
        }
    });
}

/* ════════════════════════════════════════════════
   FILE LIST  (async — never blocks the UI)
════════════════════════════════════════════════ */
var files = [];   // { name, fullPath, mtime, size }
var scanAborted = false;
var scanDoneResolve = null;  // for awaiting scan completion

function refreshFileList() {
    var folder = settings.folderPath;

    // Create a promise that resolves when scan is complete
    var scanPromise = new Promise(function (resolve) {
        scanDoneResolve = resolve;
    });

    if (!folder) {
        setStatus('No folder configured. Open Settings.', '');
        renderFiles([]);
        if (scanDoneResolve) scanDoneResolve();
        return scanPromise;
    }

    if (!fs) {
        setStatus('Node.js file system not available.', 'err');
        renderFiles([]);
        if (scanDoneResolve) scanDoneResolve();
        return scanPromise;
    }

    // Expand ~ to home directory
    var expanded = folder.replace(/^~/, process.env.HOME || '');

    if (!fs.existsSync(expanded)) {
        setStatus('Folder not found: ' + expanded, 'err');
        renderFiles([]);
        if (scanDoneResolve) scanDoneResolve();
        return scanPromise;
    }

    setStatus('Scanning folder…', 'busy');
    scanAborted = false;

    // Read directory entries (fast — just filenames, no stat calls yet)
    var allEntries;
    try {
        allEntries = fs.readdirSync(expanded);
    } catch (e) {
        setStatus('Error reading folder: ' + e.message, 'err');
        renderFiles([]);
        if (scanDoneResolve) scanDoneResolve();
        return scanPromise;
    }

    // Filter to audio files first (cheap string check)
    var audioNames = allEntries.filter(function (f) { return /\.(mp3|wav|aif|aiff|m4a)$/i.test(f); });

    if (audioNames.length === 0) {
        files = [];
        renderFiles([]);
        setStatus('No audio files found in folder.', '');
        if (scanDoneResolve) scanDoneResolve();
        return scanPromise;
    }

    // How many to scan (0 = all)
    var limit = settings.maxFiles > 0 ? settings.maxFiles : audioNames.length;

    // Stat files in small async batches so the UI stays responsive
    statFilesAsync(expanded, audioNames, limit).then(function (result) {
        if (scanAborted) { if (scanDoneResolve) scanDoneResolve(); return; }
        files = result;
        renderFiles(result);
        var extra = audioNames.length > limit ? ' (showing ' + limit + ' of ' + audioNames.length + ')' : '';
        setStatus(result.length + ' file' + (result.length !== 1 ? 's' : '') + extra, 'ok');
        if (scanDoneResolve) scanDoneResolve();
    }).catch(function (e) {
        setStatus('Scan error: ' + e.message, 'err');
        renderFiles([]);
        if (scanDoneResolve) scanDoneResolve();
    });

    return scanPromise;
}

/**
 * Stat audio files in async chunks so the UI thread
 * gets a chance to repaint between batches.
 */
function statFilesAsync(dir, names, limit) {
    return new Promise(function (resolve) {
        var BATCH_SIZE = 40;
        var results = [];
        var idx = 0;
        // Only stat up to 'limit' names to save performance
        var scanCount = Math.min(names.length, limit);

        function nextBatch() {
            if (scanAborted) { resolve([]); return; }

            var end = Math.min(idx + BATCH_SIZE, scanCount);
            for (var i = idx; i < end; i++) {
                try {
                    var fullPath = nodePath.join(dir, names[i]);
                    var stat = fs.statSync(fullPath);
                    results.push({ name: names[i], fullPath: fullPath, mtime: stat.mtime, size: stat.size });
                } catch (_) { /* skip unreadable files */ }
            }
            idx = end;

            if (idx < scanCount) {
                setTimeout(nextBatch, 0);
            } else {
                results.sort(function (a, b) { return b.mtime - a.mtime; });
                resolve(results);
            }
        }
        nextBatch();
    });
}

function renderFiles(list) {
    var container = document.getElementById('fileList');
    var emptyState = document.getElementById('emptyState');
    var countLabel = document.getElementById('fileCountLabel');

    // Clear existing file items (keep emptyState)
    Array.from(container.children).forEach(function (el) {
        if (el.id !== 'emptyState') el.remove();
    });

    if (list.length === 0) {
        emptyState.style.display = '';
        countLabel.textContent = 'Recent Files';
        return;
    }

    emptyState.style.display = 'none';
    countLabel.textContent = list.length + ' Audio File' + (list.length !== 1 ? 's' : '');

    list.forEach(function (file, idx) {
        var item = document.createElement('div');
        item.className = 'file-item';
        item.dataset.idx = idx;

        var ago = timeAgo(file.mtime);
        var sizeMB = (file.size / 1024 / 1024).toFixed(1);

        item.innerHTML =
            '<div class="file-icon">' +
            '  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
            '    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>' +
            '    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>' +
            '    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>' +
            '  </svg>' +
            '</div>' +
            '<div class="file-info">' +
            '  <div class="file-name" title="' + esc(file.name) + '">' + esc(file.name) + '</div>' +
            '  <div class="file-meta">' + ago + ' · ' + sizeMB + ' MB</div>' +
            '</div>' +
            '<div class="file-actions">' +
            '  <button class="action-btn import-only-btn" data-idx="' + idx + '" title="Import to bin only">' +
            '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
            '    Import' +
            '  </button>' +
            '  <button class="action-btn insert-btn" data-idx="' + idx + '" title="Import and insert at playhead">' +
            '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>' +
            '    Insert' +
            '  </button>' +
            '</div>';

        container.appendChild(item);
    });
}

function esc(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timeAgo(date) {
    var diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.round(diff / 60) + 'm ago';
    if (diff < 86400) return Math.round(diff / 3600) + 'h ago';
    return Math.round(diff / 86400) + 'd ago';
}

/* ════════════════════════════════════════════════
   IMPORT / INSERT LOGIC
════════════════════════════════════════════════ */

// Import only — add to bin, no sequence placement
function importFileOnly(file) {
    setStatus('Importing ' + file.name + '…', 'busy');
    disableButtons(true);

    var binPath = settings.binPath || '';
    var jsxPath = file.fullPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var jsxBin = binPath.replace(/'/g, "\\'");

    var script = "importOnly('" + jsxPath + "', '" + jsxBin + "')";

    return evalScript(script).then(function (result) {
        if (result === 'DEV_MODE') {
            setStatus('(Dev mode) Would import: ' + file.name, 'ok');
        } else if (typeof result === 'string' && result.indexOf('ERROR') === 0) {
            setStatus(result.replace('ERROR: ', ''), 'err');
        } else {
            setStatus('✓ Imported to bin: ' + file.name, 'ok');
        }
    }).catch(function (e) {
        setStatus('Failed: ' + e.message, 'err');
    }).then(function () {
        disableButtons(false);
    });
}

// Insert — import + place on timeline at playhead
function insertFile(file) {
    setStatus('Inserting ' + file.name + '…', 'busy');
    disableButtons(true);

    var binPath = settings.binPath || '';
    var trackIndex = settings.trackIndex;
    var jsxPath = file.fullPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    var jsxBin = binPath.replace(/'/g, "\\'");

    var script = "importAndPlace('" + jsxPath + "', '" + jsxBin + "', " + trackIndex + ")";

    return evalScript(script).then(function (result) {
        if (result === 'DEV_MODE') {
            setStatus('(Dev mode) Would insert: ' + file.name, 'ok');
        } else if (typeof result === 'string' && result.indexOf('ERROR') === 0) {
            setStatus(result.replace('ERROR: ', ''), 'err');
        } else {
            setStatus('✓ Inserted at playhead: ' + file.name, 'ok');
        }
    }).catch(function (e) {
        setStatus('Failed: ' + e.message, 'err');
    }).then(function () {
        disableButtons(false);
    });
}

// Latest helpers — optionally refresh first
function importLatest() {
    var doIt = function () {
        if (files.length === 0) {
            setStatus('No audio files found.', 'err');
            return;
        }
        importFileOnly(files[0]);
    };

    if (settings.refreshBeforeLatest) {
        refreshFileList().then(doIt);
    } else {
        doIt();
    }
}

function insertLatest() {
    var doIt = function () {
        if (files.length === 0) {
            setStatus('No audio files found.', 'err');
            return;
        }
        insertFile(files[0]);
    };

    if (settings.refreshBeforeLatest) {
        refreshFileList().then(doIt);
    } else {
        doIt();
    }
}

/* ════════════════════════════════════════════════
   STATUS BAR
════════════════════════════════════════════════ */
function setStatus(msg, type) {
    type = type || '';
    var bar = document.getElementById('statusBar');
    var text = document.getElementById('statusText');
    bar.className = 'status-bar ' + type;
    text.textContent = msg;
}

function disableButtons(disabled) {
    document.getElementById('importLatestBtn').disabled = disabled;
    document.getElementById('insertLatestBtn').disabled = disabled;
    document.getElementById('refreshBtn').disabled = disabled;
}

/* ════════════════════════════════════════════════
   TABS  — always work, even during a scan
════════════════════════════════════════════════ */
function switchTab(viewId) {
    scanAborted = true;
    if (window._switchTab) window._switchTab(viewId);
}

/* ════════════════════════════════════════════════
   EVENT LISTENERS
════════════════════════════════════════════════ */

// Import Latest / Insert Latest
document.getElementById('importLatestBtn').addEventListener('click', importLatest);
document.getElementById('insertLatestBtn').addEventListener('click', insertLatest);

// Refresh
document.getElementById('refreshBtn').addEventListener('click', function () { refreshFileList(); });

// Save & Reset settings
document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);
document.getElementById('resetSettingsBtn').addEventListener('click', resetSettings);

// Browse button
document.getElementById('browseBtn').addEventListener('click', browseFolder);

// Max files dropdown — show/hide custom input
document.getElementById('maxFilesSelect').addEventListener('change', function () {
    var custom = document.getElementById('maxFilesCustomInput');
    custom.style.display = (this.value === 'custom') ? '' : 'none';
});

// Per-file Import / Insert buttons (event delegation)
document.getElementById('fileList').addEventListener('click', function (e) {
    var importBtn = e.target.closest('.import-only-btn');
    var insertBtn = e.target.closest('.insert-btn');

    if (importBtn) {
        var idx = parseInt(importBtn.dataset.idx, 10);
        if (files[idx]) importFileOnly(files[idx]);
    } else if (insertBtn) {
        var idx2 = parseInt(insertBtn.dataset.idx, 10);
        if (files[idx2]) insertFile(files[idx2]);
    }
});

/* ════════════════════════════════════════════════
   KEYBOARD SHORTCUTS (configurable + global via CEP)
════════════════════════════════════════════════ */

var KEY_NAMES = {
    8: '⌫', 9: 'Tab', 13: '↵', 16: 'Shift', 17: 'Ctrl', 18: 'Alt', 27: 'Esc',
    32: 'Space', 37: '←', 38: '↑', 39: '→', 40: '↓', 46: 'Del',
    48: '0', 49: '1', 50: '2', 51: '3', 52: '4', 53: '5', 54: '6', 55: '7', 56: '8', 57: '9',
    65: 'A', 66: 'B', 67: 'C', 68: 'D', 69: 'E', 70: 'F', 71: 'G', 72: 'H', 73: 'I',
    74: 'J', 75: 'K', 76: 'L', 77: 'M', 78: 'N', 79: 'O', 80: 'P', 81: 'Q', 82: 'R',
    83: 'S', 84: 'T', 85: 'U', 86: 'V', 87: 'W', 88: 'X', 89: 'Y', 90: 'Z',
    112: 'F1', 113: 'F2', 114: 'F3', 115: 'F4', 116: 'F5', 117: 'F6',
    118: 'F7', 119: 'F8', 120: 'F9', 121: 'F10', 122: 'F11', 123: 'F12',
    186: ';', 187: '=', 188: ',', 189: '-', 190: '.', 191: '/', 192: '`',
    219: '[', 220: '\\', 221: ']', 222: "'"
};

function shortcutLabel(sc) {
    if (!sc || !sc.keyCode) return 'None';
    var parts = [];
    if (sc.ctrlKey) parts.push('Ctrl');
    if (sc.altKey) parts.push('Alt');
    if (sc.shiftKey) parts.push('⇧');
    if (sc.metaKey) parts.push('⌘');
    parts.push(KEY_NAMES[sc.keyCode] || ('Key' + sc.keyCode));
    return parts.join('+');
}

function registerShortcuts() {
    if (!_cep) return;

    var keysToRegister = [];
    var sc = settings.shortcuts || {};

    if (sc.importLatest && sc.importLatest.keyCode) keysToRegister.push(sc.importLatest);
    if (sc.insertLatest && sc.insertLatest.keyCode) keysToRegister.push(sc.insertLatest);

    if (keysToRegister.length > 0) {
        try {
            _cep.registerKeyEventsInterest(JSON.stringify(keysToRegister));
        } catch (e) {
            console.warn('registerKeyEventsInterest failed:', e);
        }
    }
}

function shortcutMatches(event, sc) {
    if (!sc || !sc.keyCode) return false;
    return event.keyCode === sc.keyCode &&
           event.metaKey === (sc.metaKey || false) &&
           event.shiftKey === (sc.shiftKey || false) &&
           event.altKey === (sc.altKey || false) &&
           event.ctrlKey === (sc.ctrlKey || false);
}

document.addEventListener('keydown', function (e) {
    var sc = settings.shortcuts || {};
    if (shortcutMatches(e, sc.importLatest)) {
        e.preventDefault();
        importLatest();
    } else if (shortcutMatches(e, sc.insertLatest)) {
        e.preventDefault();
        insertLatest();
    }
});

// ── Shortcut Recording ──
// Use a hidden input to capture keys; CEP panels often don't receive keydown for letter keys
// when focus is on a button or the host app captures keys. Focusing an input makes key events
// reliably delivered to the panel.

var activeRecordingBtn = null;
var shortcutRecordInput = null;

function ensureShortcutRecordInput() {
    if (shortcutRecordInput) return shortcutRecordInput;
    shortcutRecordInput = document.createElement('input');
    shortcutRecordInput.type = 'text';
    shortcutRecordInput.setAttribute('aria-hidden', 'true');
    shortcutRecordInput.tabIndex = -1;
    shortcutRecordInput.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;';
    document.body.appendChild(shortcutRecordInput);
    shortcutRecordInput.addEventListener('keydown', function (e) {
        if (!activeRecordingBtn) return;
        handleShortcutRecord(e);
    }, true);
    return shortcutRecordInput;
}

function startRecording(btn) {
    if (activeRecordingBtn) stopRecording(activeRecordingBtn);
    activeRecordingBtn = btn;
    btn.classList.add('recording');
    btn.textContent = 'Press keys…';
    var input = ensureShortcutRecordInput();
    input.value = '';
    input.focus();
}

function stopRecording(btn) {
    if (btn) btn.classList.remove('recording');
    activeRecordingBtn = null;
    if (shortcutRecordInput) shortcutRecordInput.blur();
}

function handleShortcutRecord(e) {
    if (!activeRecordingBtn) return;
    // Ignore lone modifier presses (Shift, Ctrl, Alt, Meta left/right, Cmd on Mac)
    if ([16, 17, 18, 91, 93, 224].indexOf(e.keyCode) !== -1) return;

    e.preventDefault();
    e.stopPropagation();

    var sc = {
        keyCode: e.keyCode,
        metaKey: e.metaKey,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        ctrlKey: e.ctrlKey
    };

    var actionName = activeRecordingBtn.getAttribute('data-action');
    settings.shortcuts[actionName] = sc;

    activeRecordingBtn.textContent = shortcutLabel(sc);
    stopRecording(activeRecordingBtn);
    updateShortcutHints();
}

document.addEventListener('keydown', handleShortcutRecord, true);

function updateShortcutHints() {
    var sc = settings.shortcuts || {};
    var importHint = document.getElementById('importShortcutHint');
    var insertHint = document.getElementById('insertShortcutHint');
    if (importHint) importHint.textContent = shortcutLabel(sc.importLatest);
    if (insertHint) insertHint.textContent = shortcutLabel(sc.insertLatest);
}

// ── Shortcut Button Event Listeners ──

document.getElementById('importShortcutBtn').addEventListener('click', function () {
    startRecording(this);
});
document.getElementById('insertShortcutBtn').addEventListener('click', function () {
    startRecording(this);
});

document.getElementById('clearImportShortcut').addEventListener('click', function () {
    var btn = document.getElementById('importShortcutBtn');
    if (activeRecordingBtn === btn) stopRecording(btn);
    settings.shortcuts.importLatest = { keyCode: 0 };
    btn.textContent = 'None';
    updateShortcutHints();
});
document.getElementById('clearInsertShortcut').addEventListener('click', function () {
    var btn = document.getElementById('insertShortcutBtn');
    if (activeRecordingBtn === btn) stopRecording(btn);
    settings.shortcuts.insertLatest = { keyCode: 0 };
    btn.textContent = 'None';
    updateShortcutHints();
});

// ── Copy Menu Title Buttons ──

function copyToClipboard(text) {
    var el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}

document.getElementById('copyImportTitle').addEventListener('click', function () {
    copyToClipboard('AN: Import Latest');
    this.textContent = 'Copied!';
    var btn = this;
    setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
});
document.getElementById('copyInsertTitle').addEventListener('click', function () {
    copyToClipboard('AN: Insert Latest');
    this.textContent = 'Copied!';
    var btn = this;
    setTimeout(function () { btn.textContent = 'Copy'; }, 1500);
});

// ── Headless Extension Listener ──
// Headless extensions don't have direct access to the Node.js context variables, so they 
// write a timestamp to localStorage to trigger the main panel to do the work.
window.addEventListener('storage', function (e) {
    if (e.key === 'AN_CMD_IMPORT') {
        importLatest();
    } else if (e.key === 'AN_CMD_INSERT') {
        insertLatest();
    }
});

// ── Reset Settings ──

function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
        localStorage.removeItem(SETTINGS_KEY);
        settings = {
            folderPath: '',
            binPath: 'Audio/VO',
            trackIndex: 0,
            maxFiles: 500,
            refreshBeforeLatest: true,
            shortcuts: {
                importLatest: { keyCode: 73, metaKey: true, shiftKey: false, altKey: false, ctrlKey: false },
                insertLatest: { keyCode: 73, metaKey: true, shiftKey: true, altKey: false, ctrlKey: false }
            }
        };
        loadSettings();
        registerShortcuts();
        setStatus('Settings reset to defaults.', 'ok');
    }
}

/* ════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
try {
    loadSettings();
    registerShortcuts();

    // Defer the first scan so the UI renders first
    setTimeout(function () {
        refreshFileList();
    }, 50);

    // Ping ExtendScript to confirm JSX is loaded
    evalScript('ping()').then(function (result) {
        if (result === 'pong') {
            setStatus('Connected to Premiere Pro.', 'ok');
        } else if (result !== 'DEV_MODE') {
            setStatus('Premiere Pro not responding. Restart the panel.', 'err');
        }
    });
} catch (initErr) {
    setStatus('Init error: ' + initErr.message, 'err');
}

