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
    return new Promise((resolve) => {
        if (!_cep) {
            console.warn('[DevMode] evalScript called:', script.slice(0, 80));
            resolve('DEV_MODE');
            return;
        }
        _cep.evalScript(script, (result) => resolve(result));
    });
}

/* ════════════════════════════════════════════════
   SETTINGS
════════════════════════════════════════════════ */
const SETTINGS_KEY = 'autoNarrationPremiereSettings';

let settings = {
    folderPath: '',
    binPath: 'Audio/VO',
    trackIndex: 0,   // 0-based internally, shown as 1-based in UI
    maxFiles: 5,     // how many recent files to show
};

function loadSettings() {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (raw) Object.assign(settings, JSON.parse(raw));
    } catch (e) { }
    populateSettingsForm();
}

function populateSettingsForm() {
    document.getElementById('folderPathInput').value = settings.folderPath;
    document.getElementById('binPathInput').value = settings.binPath;
    document.getElementById('trackIndexInput').value = settings.trackIndex + 1;
    document.getElementById('maxFilesInput').value = settings.maxFiles;
}

function saveSettings() {
    settings.folderPath = document.getElementById('folderPathInput').value.trim();
    settings.binPath = document.getElementById('binPathInput').value.trim();
    settings.trackIndex = Math.max(0, parseInt(document.getElementById('trackIndexInput').value, 10) - 1);
    settings.maxFiles = Math.max(1, parseInt(document.getElementById('maxFilesInput').value, 10) || 5);

    try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch (e) { }

    setStatus('Settings saved.', 'ok');
    switchTab('mainView');
    refreshFileList();
}

/* ════════════════════════════════════════════════
   FILE LIST  (async — never blocks the UI)
════════════════════════════════════════════════ */
let files = [];   // { name, fullPath, mtime, size }
let scanAborted = false;

function refreshFileList() {
    const folder = settings.folderPath;

    if (!folder) {
        setStatus('No folder configured. Open Settings.', '');
        renderFiles([]);
        return;
    }

    if (!fs) {
        setStatus('Node.js file system not available.', 'err');
        renderFiles([]);
        return;
    }

    // Expand ~ to home directory
    const expanded = folder.replace(/^~/, process.env.HOME || '');

    if (!fs.existsSync(expanded)) {
        setStatus('Folder not found: ' + expanded, 'err');
        renderFiles([]);
        return;
    }

    setStatus('Scanning folder…', 'busy');
    scanAborted = false;

    // Read directory entries (fast — just filenames, no stat calls yet)
    let allEntries;
    try {
        allEntries = fs.readdirSync(expanded);
    } catch (e) {
        setStatus('Error reading folder: ' + e.message, 'err');
        renderFiles([]);
        return;
    }

    // Filter to audio files first (cheap string check)
    const audioNames = allEntries.filter(f => /\.(mp3|wav|aif|aiff|m4a)$/i.test(f));

    if (audioNames.length === 0) {
        files = [];
        renderFiles([]);
        setStatus('No audio files found in folder.', '');
        return;
    }

    // Stat files in small async batches so the UI stays responsive
    const limit = settings.maxFiles;
    statFilesAsync(expanded, audioNames, limit).then(result => {
        if (scanAborted) return; // user navigated away
        files = result;
        renderFiles(result);
        const extra = audioNames.length > limit ? ' (showing ' + limit + ' of ' + audioNames.length + ')' : '';
        setStatus(result.length + ' file' + (result.length !== 1 ? 's' : '') + extra, 'ok');
    }).catch(e => {
        setStatus('Scan error: ' + e.message, 'err');
        renderFiles([]);
    });
}

/**
 * Stat audio files in async chunks of BATCH_SIZE so the UI thread
 * gets a chance to repaint between batches.  We stat ALL files to
 * find their mtime, then sort by newest and return only `limit` items.
 *
 * Optimisation: we only call fs.stat (async) instead of fs.statSync.
 */
function statFilesAsync(dir, names, limit) {
    return new Promise((resolve, reject) => {
        const BATCH_SIZE = 20;
        const results = [];
        let idx = 0;

        function nextBatch() {
            if (scanAborted) { resolve([]); return; }

            const end = Math.min(idx + BATCH_SIZE, names.length);
            for (let i = idx; i < end; i++) {
                try {
                    const fullPath = nodePath.join(dir, names[i]);
                    const stat = fs.statSync(fullPath);
                    results.push({ name: names[i], fullPath, mtime: stat.mtime, size: stat.size });
                } catch (_) { /* skip unreadable files */ }
            }
            idx = end;

            if (idx < names.length) {
                // Yield to the event loop so tabs / buttons stay responsive
                setTimeout(nextBatch, 0);
            } else {
                // Done — sort newest first, trim to limit
                results.sort((a, b) => b.mtime - a.mtime);
                resolve(results.slice(0, limit));
            }
        }
        nextBatch();
    });
}

function renderFiles(list) {
    const container = document.getElementById('fileList');
    const emptyState = document.getElementById('emptyState');
    const countLabel = document.getElementById('fileCountLabel');

    // Clear existing file items (keep emptyState)
    Array.from(container.children).forEach(el => {
        if (el.id !== 'emptyState') el.remove();
    });

    if (list.length === 0) {
        emptyState.style.display = '';
        countLabel.textContent = 'Recent Files';
        return;
    }

    emptyState.style.display = 'none';
    countLabel.textContent = list.length + ' Audio File' + (list.length !== 1 ? 's' : '');

    list.forEach((file, idx) => {
        const item = document.createElement('div');
        item.className = 'file-item';
        item.dataset.idx = idx;

        const ago = timeAgo(file.mtime);
        const sizeMB = (file.size / 1024 / 1024).toFixed(1);

        item.innerHTML = `
      <div class="file-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
      </div>
      <div class="file-info">
        <div class="file-name" title="${esc(file.name)}">${esc(file.name)}</div>
        <div class="file-meta">${ago} · ${sizeMB} MB</div>
      </div>
      <button class="import-btn" data-idx="${idx}" title="Import this file to Premiere">Import</button>
    `;

        container.appendChild(item);
    });
}

function esc(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function timeAgo(date) {
    const diff = (Date.now() - date.getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.round(diff / 60) + 'm ago';
    if (diff < 86400) return Math.round(diff / 3600) + 'h ago';
    return Math.round(diff / 86400) + 'd ago';
}

/* ════════════════════════════════════════════════
   IMPORT LOGIC
════════════════════════════════════════════════ */
async function importFile(file) {
    setStatus('Importing ' + file.name + '…', 'busy');
    disableButtons(true);

    const binPath = settings.binPath || '';
    const trackIndex = settings.trackIndex;

    const jsxPath = file.fullPath.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const jsxBin = binPath.replace(/'/g, "\\'");

    const script = `importAndPlace('${jsxPath}', '${jsxBin}', ${trackIndex})`;

    try {
        const result = await evalScript(script);

        if (result === 'DEV_MODE') {
            setStatus('(Dev mode) Would import: ' + file.name, 'ok');
        } else if (typeof result === 'string' && result.startsWith('ERROR')) {
            setStatus(result.replace('ERROR: ', ''), 'err');
        } else {
            setStatus('✓ Imported: ' + file.name, 'ok');
        }
    } catch (e) {
        setStatus('Failed: ' + e.message, 'err');
    } finally {
        disableButtons(false);
    }
}

async function importLatest() {
    refreshFileList();
    // Wait a tick for the async scan to finish, then import
    setTimeout(async () => {
        if (files.length === 0) {
            setStatus('No audio files found in the configured folder.', 'err');
            return;
        }
        await importFile(files[0]);
    }, 100);
}

/* ════════════════════════════════════════════════
   STATUS BAR
════════════════════════════════════════════════ */
function setStatus(msg, type = '') {
    const bar = document.getElementById('statusBar');
    const text = document.getElementById('statusText');
    bar.className = 'status-bar ' + type;
    text.textContent = msg;
}

function disableButtons(disabled) {
    document.getElementById('importLatestBtn').disabled = disabled;
    document.getElementById('refreshBtn').disabled = disabled;
}

/* ════════════════════════════════════════════════
   TABS  — always work, even during a scan
════════════════════════════════════════════════ */
function switchTab(viewId) {
    // Abort any in-progress scan when switching tabs
    scanAborted = true;
    // Use the inline bootstrap's switchTab for the actual DOM work
    if (window._switchTab) window._switchTab(viewId);
}

/* ════════════════════════════════════════════════
   EVENT LISTENERS
════════════════════════════════════════════════ */

// Import latest
document.getElementById('importLatestBtn').addEventListener('click', importLatest);

// Refresh
document.getElementById('refreshBtn').addEventListener('click', refreshFileList);

// Save settings
document.getElementById('saveSettingsBtn').addEventListener('click', saveSettings);

// Per-file import button (event delegation)
document.getElementById('fileList').addEventListener('click', (e) => {
    const btn = e.target.closest('.import-btn');
    if (btn) {
        const idx = parseInt(btn.dataset.idx, 10);
        if (files[idx]) importFile(files[idx]);
    }
});

/* ════════════════════════════════════════════════
   INIT
════════════════════════════════════════════════ */
try {
    loadSettings();
    // Defer the first scan so the UI renders first
    setTimeout(() => {
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
